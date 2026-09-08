import { PrismaClient } from '@/generated/prisma/client';

let prismaInstance: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaInstance = new PrismaClient({} as any);
  }
  return prismaInstance;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prisma;
