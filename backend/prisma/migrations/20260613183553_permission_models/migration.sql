-- AlterTable
ALTER TABLE "users" ADD COLUMN     "group_id" INTEGER,
ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "permission_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "permissions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_groups_slug_key" ON "permission_groups"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_user_id_permission_key" ON "admin_permissions"("user_id", "permission");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "permission_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
