import { PrismaClient, Role } from '../src/generated/prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({} as any);

async function main() {
  console.log('Seeding GDG Showcase database with demo users, projects, and reviews...');

  // Create Students
  const student1 = await prisma.user.upsert({
    where: { email: 'aarav.sharma@svec.edu' },
    update: {},
    create: {
      id: 'demo-student-1',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@svec.edu',
      role: Role.STUDENT,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'diya.patel@svec.edu' },
    update: {},
    create: {
      id: 'demo-student-2',
      name: 'Diya Patel',
      email: 'diya.patel@svec.edu',
      role: Role.STUDENT,
    },
  });

  // Create Mentors
  const mentor1 = await prisma.user.upsert({
    where: { email: 'vikram.seth@gdg.community' },
    update: {},
    create: {
      id: 'demo-mentor-1',
      name: 'Dr. Vikram Seth',
      email: 'vikram.seth@gdg.community',
      role: Role.MENTOR,
    },
  });

  const mentor2 = await prisma.user.upsert({
    where: { email: 'priya.sundaram@gdg.community' },
    update: {},
    create: {
      id: 'demo-mentor-2',
      name: 'Priya Sundaram',
      email: 'priya.sundaram@gdg.community',
      role: Role.MENTOR,
    },
  });

  // Create Sample Projects
  const proj1 = await prisma.project.create({
    data: {
      title: 'DevFest AI Companion & Event Navigator',
      description: 'An AI-powered mobile and web application providing real-time event schedules, speaker Q&A, and personalized session recommendations using RAG.',
      domain: 'AI/ML',
      year: '2026',
      techStack: ['Python', 'PyTorch', 'Next.js', 'Tailwind CSS'],
      githubUrl: 'https://github.com/gdg-svec/devfest-ai-companion',
      demoUrl: 'https://devfest-ai-demo.vercel.app',
      studentId: student1.id,
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      title: 'Smart Campus IoT Environmental Monitor',
      description: 'A network of ESP32 microcontrollers monitoring air quality, temperature, and classroom occupancy across campus with live dashboard updates.',
      domain: 'IoT',
      year: '2025',
      techStack: ['C++', 'ESP32', 'MQTT', 'Node.js', 'React'],
      githubUrl: 'https://github.com/gdg-svec/iot-campus-monitor',
      demoUrl: 'https://iot-campus.demo.app',
      studentId: student2.id,
    },
  });

  await prisma.project.create({
    data: {
      title: 'Cloud-Native Distributed Log Analytics Engine',
      description: 'High-throughput log aggregation service built with Go and Kubernetes for real-time error detection and observability.',
      domain: 'Cloud',
      year: '2026',
      techStack: ['Go', 'Docker', 'Kubernetes', 'Prometheus'],
      githubUrl: 'https://github.com/gdg-svec/cloud-log-engine',
      studentId: student1.id,
    },
  });

  // Create Sample Mentor Reviews
  await prisma.review.create({
    data: {
      projectId: proj1.id,
      mentorId: mentor1.id,
      codeQualityScore: 9,
      innovationScore: 10,
      completenessScore: 9,
      comments: 'Outstanding architecture! The RAG implementation is slick and production-grade.',
    },
  });

  await prisma.review.create({
    data: {
      projectId: proj1.id,
      mentorId: mentor2.id,
      codeQualityScore: 8,
      innovationScore: 9,
      completenessScore: 8,
      comments: 'Great UI/UX design. Excellent demo presentation during DevFest.',
    },
  });

  await prisma.review.create({
    data: {
      projectId: proj2.id,
      mentorId: mentor1.id,
      codeQualityScore: 8,
      innovationScore: 8,
      completenessScore: 7,
      comments: 'Solid IoT hardware deployment. Could improve dashboard responsiveness.',
    },
  });

  console.log('Database successfully seeded with fictional GDG demo data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
