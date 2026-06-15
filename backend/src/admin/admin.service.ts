import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRepository } from './admin.repository';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import { rowToProfile, userToProfile, type UserProfile } from '../common/user-row';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AdminRepository,
  ) {}

  // ── Gruppi (letture: Prisma; scritture: SP) ──────────

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
    const row = await this.repo.spCreateGroup({
      actorId,
      name: dto.name,
      slug: dto.slug,
      permissions: dto.permissions,
      ip,
    });
    return this.prisma.permissionGroup.findUnique({
      where: { id: row.id },
      include: { _count: { select: { users: true } } },
    });
  }

  async updateGroup(id: number, dto: UpdateGroupDto, actorId: number, ip?: string) {
    await this.repo.spUpdateGroup({
      actorId,
      groupId: id,
      name: dto.name,
      slug: dto.slug,
      permissions: dto.permissions,
      ip,
    });
    return this.prisma.permissionGroup.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
  }

  async deleteGroup(id: number, actorId: number, ip?: string) {
    await this.repo.spDeleteGroup({ actorId, groupId: id, ip });
  }

  // ── Utenti (lista completa per admin panel) ─────────

  async listAllUsers(params: {
    q?: string;
    stato?: 'ATTIVO' | 'BLOCCATO';
    page: number;
    pageSize: number;
  }): Promise<{ items: UserProfile[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(params.stato ? { stato: params.stato } : {}),
      ...(params.q
        ? {
            OR: [
              { email: { contains: params.q, mode: 'insensitive' } },
              { nome: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(userToProfile), total };
  }

  // ── Permessi utente (letture: Prisma; scritture: SP) ─

  async getUserPermissions(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        group: true,
        adminPermissions: true,
      },
    });
    if (!user) throw new NotFoundException('users.not_found');

    const effective = new Set(user.group?.permissions ?? []);
    const overrides: { permission: string; granted: boolean }[] = [];

    for (const o of user.adminPermissions) {
      if (o.granted) {
        effective.add(o.permission);
      } else {
        effective.delete(o.permission);
      }
      overrides.push({ permission: o.permission, granted: o.granted });
    }

    return {
      user: userToProfile(user),
      group: user.group
        ? { id: user.group.id, name: user.group.name, slug: user.group.slug }
        : null,
      overrides,
      effectivePermissions: [...effective].sort(),
    };
  }

  async updateUserPermissions(
    userId: number,
    dto: UpdateUserPermissionsDto,
    actorId: number,
    ip?: string,
  ) {
    if (dto.overrides) {
      for (const ov of dto.overrides) {
        await this.repo.spUpsertPermission({
          actorId,
          userId,
          permission: ov.permission,
          granted: ov.granted,
          ip,
        });
      }
    }

    if (dto.removeOverrides && dto.removeOverrides.length > 0) {
      await this.repo.spRemovePermissions({
        actorId,
        userId,
        permissions: dto.removeOverrides,
        ip,
      });
    }

    return this.getUserPermissions(userId);
  }

  async assignUserGroup(
    userId: number,
    groupId: number | null,
    actorId: number,
    ip?: string,
  ) {
    const row = await this.repo.spAssignGroup({
      actorId,
      userId,
      groupId,
      ip,
    });
    return rowToProfile(row);
  }
}
