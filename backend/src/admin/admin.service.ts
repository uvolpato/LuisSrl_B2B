import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { toUserProfile } from '../common/auth-types';
import type { UserProfile } from '../common/auth-types';
import { buildStatoFilter } from '../common/filters';
import type { UserFilter } from '../common/filters';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listGroups() {
    return this.prisma.permissionGroup.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async getGroup(id: number) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!group) throw new NotFoundException('admin.group_not_found');
    return group;
  }

  async createGroup(dto: CreateGroupDto, actorId: number, ip?: string) {
    const existing = await this.prisma.permissionGroup.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('admin.group_slug_exists');

    const group = await this.prisma.permissionGroup.create({
      data: { name: dto.name, slug: dto.slug, permissions: dto.permissions },
    });
    await this.audit.log({ actorId, azione: 'admin.group_create', entita: 'permission_groups', entitaId: String(group.id), ip });

    return this.prisma.permissionGroup.findUnique({
      where: { id: group.id },
      include: { _count: { select: { users: true } } },
    });
  }

  async updateGroup(id: number, dto: UpdateGroupDto, actorId: number, ip?: string) {
    const group = await this.prisma.permissionGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('admin.group_not_found');

    if (dto.slug && dto.slug !== group.slug) {
      const slugExists = await this.prisma.permissionGroup.findUnique({ where: { slug: dto.slug } });
      if (slugExists) throw new ConflictException('admin.group_slug_exists');
    }

    await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.permissions !== undefined && { permissions: dto.permissions }),
      },
    });
    await this.audit.log({ actorId, azione: 'admin.group_update', entita: 'permission_groups', entitaId: String(id), ip });

    return this.prisma.permissionGroup.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
  }

  async deleteGroup(id: number, actorId: number, ip?: string) {
    const group = await this.prisma.permissionGroup.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!group) throw new NotFoundException('admin.group_not_found');
    if (group._count.users > 0) throw new ConflictException('admin.group_has_users');

    await this.prisma.permissionGroup.delete({ where: { id } });
    await this.audit.log({ actorId, azione: 'admin.group_delete', entita: 'permission_groups', entitaId: String(id), ip });
  }

  async listAllUsers(params: {
    q?: string;
    stato?: UserFilter;
    page: number;
    pageSize: number;
  }): Promise<{ items: UserProfile[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...buildStatoFilter(params.stato),
      ...(params.q
        ? { OR: [
            { email: { contains: params.q, mode: 'insensitive' } },
            { nome: { contains: params.q, mode: 'insensitive' } },
          ]}
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(toUserProfile), total };
  }

  async getUserPermissions(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { group: true, adminPermissions: true },
    });
    if (!user) throw new NotFoundException('users.not_found');

    const effective = new Set(user.group?.permissions ?? []);
    const overrides: { permission: string; granted: boolean }[] = [];

    for (const o of user.adminPermissions) {
      if (o.granted) effective.add(o.permission);
      else effective.delete(o.permission);
      overrides.push({ permission: o.permission, granted: o.granted });
    }

    return {
      user: toUserProfile(user),
      group: user.group ? { id: user.group.id, name: user.group.name, slug: user.group.slug } : null,
      overrides,
      effectivePermissions: [...effective].sort(),
    };
  }

  async updateUserPermissions(userId: number, dto: UpdateUserPermissionsDto, actorId: number, ip?: string) {
    if (dto.overrides) {
      for (const ov of dto.overrides) {
        await this.prisma.adminPermission.upsert({
          where: { userId_permission: { userId, permission: ov.permission } },
          update: { granted: ov.granted },
          create: { userId, permission: ov.permission, granted: ov.granted },
        });
      }
    }
    if (dto.removeOverrides && dto.removeOverrides.length > 0) {
      await this.prisma.adminPermission.deleteMany({
        where: { userId, permission: { in: dto.removeOverrides } },
      });
    }
    await this.audit.log({ actorId, azione: 'admin.permissions_update', entita: 'users', entitaId: String(userId), ip });
    return this.getUserPermissions(userId);
  }

  async assignUserGroup(userId: number, groupId: number | null, actorId: number, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('users.not_found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { groupId },
    });
    await this.audit.log({ actorId, azione: 'admin.user_assign_group', entita: 'users', entitaId: String(userId), ip });
    return toUserProfile(updated);
  }

  // ── Configurazioni sito ──

  async listConfig() {
    return this.prisma.siteConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async updateConfig(key: string, value: string, actorId: number, ip?: string) {
    await this.prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    await this.audit.log({ actorId, azione: 'admin.config_update', entita: 'site_config', entitaId: key, ip });
  }
}
