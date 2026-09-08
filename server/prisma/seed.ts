import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@mlmlottery.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: adminEmail,
      mobile: '9999999999',
      passwordHash: await hash(adminPassword),
      role: 'SUPER_ADMIN',
      referralCode: 'ADMIN001',
      status: 'ACTIVE',
      isCompanyWallet: true,
    },
  });

  const existingSettings = await prisma.mlmSettings.findFirst({ where: { effectiveTo: null } });
  if (!existingSettings) {
    await prisma.mlmSettings.create({
      data: {
        maxLevels: 5,
        commissionBase: 'SEM_VALUE',
        payoutMode: 'INSTANT',
        minPayoutThreshold: 0,
        shortfallPolicy: 'ROLLUP_TO_ADMIN',
        levelPercentages: {
          create: [
            { levelNumber: 1, percentage: 10 },
            { levelNumber: 2, percentage: 5 },
            { levelNumber: 3, percentage: 3 },
            { levelNumber: 4, percentage: 2 },
            { levelNumber: 5, percentage: 1 },
          ],
        },
      },
    });
    console.log('Seeded default MLM settings (5 levels: 10/5/3/2/1%)');
  }

  const existingBasePrice = await prisma.appSetting.findUnique({ where: { key: 'ticketBasePrice' } });
  if (!existingBasePrice) {
    await prisma.appSetting.create({ data: { key: 'ticketBasePrice', value: 7 } });
    console.log('Seeded default ticket base price: 7');
  }

  const seriesDefs = [
    { name: '1 SEM', multiplier: 1 },
    { name: '2 SEM', multiplier: 2 },
    { name: '3 SEM', multiplier: 3 },
    { name: '4 SEM', multiplier: 4 },
    { name: '5 SEM', multiplier: 5 },
  ];
  for (const s of seriesDefs) {
    const existing = await prisma.series.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.series.create({ data: { ...s, status: 'ACTIVE' } });
  }

  const slotDefs = [
    { name: '1 PM Draw', salesOpenTime: '10:00', drawCloseTime: '13:00' },
    { name: '6 PM Draw', salesOpenTime: '14:00', drawCloseTime: '18:00' },
    { name: '8 PM Draw', salesOpenTime: '18:30', drawCloseTime: '20:00' },
  ];
  for (const s of slotDefs) {
    const existing = await prisma.drawSlot.findFirst({ where: { name: s.name } });
    if (!existing) {
      const [oh, om] = s.salesOpenTime.split(':').map(Number);
      const [ch, cm] = s.drawCloseTime.split(':').map(Number);
      await prisma.drawSlot.create({
        data: {
          name: s.name,
          salesOpenTime: new Date(Date.UTC(1970, 0, 1, oh, om)),
          drawCloseTime: new Date(Date.UTC(1970, 0, 1, ch, cm)),
          isActive: true,
        },
      });
    }
  }

  // A demo 2-deep agent chain (Agent -> Sub-Agent) under the Super Admin, so the Sell Tickets
  // flow and multi-level commission/MLM tree view have something to exercise immediately.
  const demoPassword = await hash('Demo@12345');

  const agent = await prisma.user.upsert({
    where: { email: 'agent@mlmlottery.local' },
    update: {},
    create: {
      name: 'Demo Agent',
      email: 'agent@mlmlottery.local',
      mobile: '9000000001',
      passwordHash: demoPassword,
      role: 'AGENT',
      sponsorId: admin.id,
      referralCode: 'AGT00001',
      status: 'ACTIVE',
      // Pre-filled so the demo login isn't stopped at the bank-details onboarding gate — real
      // registrations still go through it for real.
      bankAccountHolder: 'Demo Agent',
      bankAccountNumber: '1234500001',
      bankIfsc: 'SBIN0001234',
      bankName: 'State Bank of India',
      upiId: 'demoagent@okhdfcbank',
    },
  });

  await prisma.user.upsert({
    where: { email: 'subagent@mlmlottery.local' },
    update: {},
    create: {
      name: 'Demo Sub-Agent',
      email: 'subagent@mlmlottery.local',
      mobile: '9000000002',
      passwordHash: demoPassword,
      role: 'AGENT',
      sponsorId: agent.id,
      referralCode: 'AGT00002',
      status: 'ACTIVE',
      bankAccountHolder: 'Demo Sub-Agent',
      bankAccountNumber: '1234500002',
      bankIfsc: 'SBIN0001234',
      bankName: 'State Bank of India',
      upiId: 'demosubagent@okhdfcbank',
    },
  });

  const existingPaymentMethod = await prisma.paymentMethod.findFirst();
  if (!existingPaymentMethod) {
    const placeholderQr =
      'data:image/svg+xml;base64,' +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#fff"/><rect x="20" y="20" width="200" height="200" fill="none" stroke="#000" stroke-width="4"/><text x="120" y="110" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#000">Demo UPI QR</text><text x="120" y="135" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#666">Replace in Admin →</text><text x="120" y="152" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#666">Finance → Payment Methods</text></svg>',
      ).toString('base64');

    await prisma.paymentMethod.create({
      data: {
        label: 'Demo Company UPI',
        upiId: 'mlmlottery@upi',
        qrImage: placeholderQr,
        isActive: true,
        createdById: admin.id,
      },
    });
    console.log('Seeded a demo active payment method (Demo Company UPI) — replace it in Admin → Finance → Payment Methods');
  }

  console.log('\nSeed complete. Login credentials:');
  console.log(`  Super Admin:    ${adminEmail} / ${adminPassword}`);
  console.log(`  Demo Agent:     agent@mlmlottery.local / Demo@12345`);
  console.log(`  Demo Sub-Agent: subagent@mlmlottery.local / Demo@12345 (recruited by Demo Agent)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
