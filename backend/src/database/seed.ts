/**
 * Database Seed Script - High Density Version
 * Creates 200+ test records to test the admin dashboard with realistic data density
 *
 * Run with: npm run seed
 *
 * Data Distribution:
 * - 200 Participants (40 ambassadors, 60 travel grants, 100 regular)
 * - 30 Sessions (10 open, 20 scheduled across 4 days)
 * - 400+ Registrations (2+ per participant average)
 * - 300+ Check-ins (realistic attendance patterns)
 */

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigModule } from '@nestjs/config';
import {
  Participant,
  ParticipantSchema,
  ParticipantDocument,
  ParticipantStatus,
} from '../modules/participants/schemas';
import {
  Session,
  SessionSchema,
  SessionDocument,
} from '../modules/sessions/schemas';
import {
  CheckIn,
  CheckInSchema,
  CheckInDocument,
  CheckInMethod,
} from '../modules/checkins/schemas';
import {
  Registration,
  RegistrationSchema,
  RegistrationDocument,
  RegistrationStatus,
} from '../modules/registrations/schemas';
import databaseConfig from '../config/database.config';

// ============================================================================
// Extended Seed Data Arrays
// ============================================================================

const ORGANIZATIONS = [
  'MIT',
  'Stanford University',
  'Harvard Medical School',
  'Oxford University',
  'Cambridge University',
  'Yale Institute',
  'Princeton University',
  'UC Berkeley',
  'Caltech',
  'Columbia University',
  'Duke University',
  'Johns Hopkins University',
  'UCLA',
  'University of Tokyo',
  'ETH Zurich',
  'Imperial College London',
  'CERN',
  'Max Planck Institute',
  'Tsinghua University',
  'NIH',
  'Google Research',
  'Microsoft Research',
  'Meta AI',
  'OpenAI',
  'DeepMind',
  'IBM Research',
  'Apple AI',
  'Amazon Science',
  'NVIDIA Research',
  'Intel Labs',
  'Tesla AI',
  'Anthropic',
  'NASA JPL',
  'ESA',
  'SpaceX',
  'Blue Origin',
  'WHO',
  'UNESCO',
  'World Bank',
  'IMF',
  'McKinsey',
  'BCG',
  'Bain & Company',
  'Deloitte',
  'Goldman Sachs',
  'Morgan Stanley',
  'JP Morgan',
  'BlackRock',
  'Pfizer',
  'Moderna',
  'Johnson & Johnson',
  'Novartis',
  'ESPRIT',
  'INSAT',
  'ENIT',
  'FST',
  'ENSI',
  'ISI',
  'IHEC',
  'University of Tunis',
  'University of Sfax',
  'University of Sousse',
];

const FIRST_NAMES = [
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'James',
  'Sophia',
  'Oliver',
  'Isabella',
  'William',
  'Mia',
  'Benjamin',
  'Charlotte',
  'Lucas',
  'Amelia',
  'Henry',
  'Harper',
  'Alexander',
  'Evelyn',
  'Sebastian',
  'Luna',
  'Daniel',
  'Aria',
  'Michael',
  'Chloe',
  'Ethan',
  'Penelope',
  'Matthew',
  'Layla',
  'Aiden',
  'Mohamed',
  'Ahmed',
  'Fatima',
  'Youssef',
  'Mariam',
  'Ali',
  'Sara',
  'Omar',
  'Nour',
  'Khalid',
  'Salma',
  'Hassan',
  'Yasmine',
  'Karim',
  'Amira',
  'Rami',
  'Wei',
  'Mei',
  'Hiroshi',
  'Yuki',
  'Jin',
  'Min',
  'Raj',
  'Priya',
  'Arjun',
  'Ananya',
  'Pierre',
  'Marie',
  'Jean',
  'Sophie',
  'Hans',
  'Anna',
  'Carlos',
  'Maria',
  'Giovanni',
  'Giulia',
  'Dmitri',
  'Anastasia',
  'Olga',
  'Ivan',
  'Elena',
  'Viktor',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Ben Ali',
  'Trabelsi',
  'Bouazizi',
  'Mejri',
  'Chaabane',
  'Lahmar',
  'Gharbi',
  'Wang',
  'Li',
  'Zhang',
  'Chen',
  'Liu',
  'Tanaka',
  'Suzuki',
  'Yamamoto',
  'Kumar',
  'Sharma',
  'Patel',
  'Singh',
  'Gupta',
  'Verma',
  'Joshi',
  'Reddy',
  'Müller',
  'Schmidt',
  'Schneider',
  'Fischer',
  'Weber',
  'Meyer',
  'Wagner',
  'Rossi',
  'Russo',
  'Ferrari',
  'Esposito',
  'Bianchi',
  'Romano',
  'Colombo',
  'Dubois',
  'Martin',
  'Bernard',
  'Thomas',
  'Robert',
  'Richard',
  'Petit',
];

const SESSION_TEMPLATES = [
  // Day 1 - Opening & Foundations
  {
    name: 'Opening Ceremony & Welcome Address',
    location: 'Grand Auditorium',
    capacity: 500,
    day: 1,
  },
  {
    name: 'Keynote: The Future of AI in Healthcare',
    location: 'Grand Auditorium',
    capacity: 500,
    day: 1,
  },
  {
    name: 'Workshop: Machine Learning Fundamentals',
    location: 'Workshop Hall A',
    capacity: 80,
    day: 1,
  },
  {
    name: 'Workshop: Deep Learning with PyTorch',
    location: 'Workshop Hall B',
    capacity: 80,
    day: 1,
  },
  {
    name: 'Panel: Ethics in AI Research',
    location: 'Conference Room 1',
    capacity: 150,
    day: 1,
  },
  {
    name: 'Networking Lunch & Poster Session',
    location: 'Exhibition Hall',
    capacity: 300,
    day: 1,
  },
  {
    name: 'Technical Talk: Transformer Architectures',
    location: 'Lecture Hall 1',
    capacity: 200,
    day: 1,
  },
  {
    name: 'Hands-on Lab: NLP Applications',
    location: 'Computer Lab 1',
    capacity: 50,
    day: 1,
  },

  // Day 2 - Advanced Topics
  {
    name: 'Keynote: Quantum Computing Breakthroughs',
    location: 'Grand Auditorium',
    capacity: 500,
    day: 2,
  },
  {
    name: 'Workshop: Reinforcement Learning',
    location: 'Workshop Hall A',
    capacity: 80,
    day: 2,
  },
  {
    name: 'Workshop: Computer Vision Techniques',
    location: 'Workshop Hall B',
    capacity: 80,
    day: 2,
  },
  {
    name: 'Panel: Industry vs Academia',
    location: 'Conference Room 1',
    capacity: 150,
    day: 2,
  },
  {
    name: 'Research Presentations: Session A',
    location: 'Lecture Hall 1',
    capacity: 200,
    day: 2,
  },
  {
    name: 'Research Presentations: Session B',
    location: 'Lecture Hall 2',
    capacity: 200,
    day: 2,
  },
  {
    name: 'Startup Pitch Competition',
    location: 'Innovation Stage',
    capacity: 250,
    day: 2,
  },
  {
    name: 'Evening Social & Awards',
    location: 'Rooftop Terrace',
    capacity: 300,
    day: 2,
  },

  // Day 3 - Specializations
  {
    name: 'Keynote: Sustainable Technology',
    location: 'Grand Auditorium',
    capacity: 500,
    day: 3,
  },
  {
    name: 'Workshop: MLOps Best Practices',
    location: 'Workshop Hall A',
    capacity: 80,
    day: 3,
  },
  {
    name: 'Workshop: Data Engineering at Scale',
    location: 'Workshop Hall B',
    capacity: 80,
    day: 3,
  },
  {
    name: 'Roundtable: Research Funding Strategies',
    location: 'Executive Suite',
    capacity: 40,
    day: 3,
  },
  {
    name: 'Demo Session: Latest Tools & Frameworks',
    location: 'Exhibition Hall',
    capacity: 300,
    day: 3,
  },
  {
    name: 'Career Fair & Recruiting',
    location: 'Main Lobby',
    capacity: 400,
    day: 3,
  },
  {
    name: 'Technical Talk: Edge AI & IoT',
    location: 'Lecture Hall 1',
    capacity: 200,
    day: 3,
  },
  {
    name: 'Hackathon Kickoff',
    location: 'Innovation Lab',
    capacity: 100,
    day: 3,
  },

  // Day 4 - Closing & Future
  {
    name: 'Hackathon Presentations',
    location: 'Innovation Stage',
    capacity: 250,
    day: 4,
  },
  {
    name: 'Panel: Future of Work in Tech',
    location: 'Conference Room 1',
    capacity: 150,
    day: 4,
  },
  {
    name: 'Workshop: Leadership in Tech',
    location: 'Workshop Hall A',
    capacity: 80,
    day: 4,
  },
  {
    name: 'Closing Keynote: Vision 2030',
    location: 'Grand Auditorium',
    capacity: 500,
    day: 4,
  },
  {
    name: 'Award Ceremony & Recognition',
    location: 'Grand Auditorium',
    capacity: 500,
    day: 4,
  },
  {
    name: 'Farewell Reception',
    location: 'Garden Pavilion',
    capacity: 350,
    day: 4,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateQRCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QR-';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateEmail(
  firstName: string,
  lastName: string,
  index: number,
): string {
  const domains = [
    'gmail.com',
    'outlook.com',
    'university.edu',
    'research.org',
    'company.com',
    'yahoo.com',
    'proton.me',
  ];
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  return `${cleanFirst}.${cleanLast}${index}@${randomElement(domains)}`;
}

function generatePhone(): string {
  const prefixes = ['+1', '+33', '+49', '+44', '+216', '+86', '+91', '+81'];
  return `${randomElement(prefixes)}${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Seed Module
// ============================================================================

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/iastam-checkin',
    ),
    MongooseModule.forFeature([
      { name: Participant.name, schema: ParticipantSchema },
      { name: Session.name, schema: SessionSchema },
      { name: CheckIn.name, schema: CheckInSchema },
      { name: Registration.name, schema: RegistrationSchema },
    ]),
  ],
})
class SeedModule {}

// ============================================================================
// High-Density Seeder Service
// ============================================================================

class Seeder {
  constructor(
    private participantModel: Model<ParticipantDocument>,
    private sessionModel: Model<SessionDocument>,
    private checkInModel: Model<CheckInDocument>,
    private registrationModel: Model<RegistrationDocument>,
  ) {}

  async clearAll(): Promise<void> {
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      this.participantModel.deleteMany({}),
      this.sessionModel.deleteMany({}),
      this.checkInModel.deleteMany({}),
      this.registrationModel.deleteMany({}),
    ]);
    console.log('✅ All collections cleared');
  }

  async seedParticipants(): Promise<any[]> {
    console.log('\n👥 Seeding Participants (200 records)...');

    const participants: any[] = [];
    let index = 0;

    // =========================================================================
    // 40 Ambassadors with varying points and referrals
    // =========================================================================
    console.log('   Creating 40 Ambassadors...');
    for (let i = 0; i < 40; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      // Points distribution: top ambassadors have more points
      const tier = Math.floor(i / 10); // 0-9: tier 0, 10-19: tier 1, etc.
      const basePoints = [150, 100, 60, 30][tier] || 30;
      const points = basePoints + randomInt(-20, 20);

      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, index++),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: Math.random() > 0.05, // 95% active
        status: ParticipantStatus.AMBASSADOR,
        ambassadorPoints: Math.max(0, points),
        referredParticipantIds: [], // Will be filled later
        travelGrantApplied: false,
        travelGrantApproved: null,
        notes: `Ambassador - Tier ${4 - tier}`,
        createdAt: subtractDays(new Date(), randomInt(30, 90)),
      });
    }

    // =========================================================================
    // 60 Travel Grant Applicants (various states)
    // =========================================================================
    console.log('   Creating 60 Travel Grant Applicants...');

    // 20 Pending
    for (let i = 0; i < 20; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, index++),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: true,
        status: ParticipantStatus.TRAVEL_GRANT,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: true,
        travelGrantApproved: null, // Pending
        travelGrantAppliedAt: subtractDays(new Date(), randomInt(1, 14)),
        notes: 'Travel grant - Awaiting review',
        createdAt: subtractDays(new Date(), randomInt(14, 60)),
      });
    }

    // 25 Approved
    for (let i = 0; i < 25; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const appliedAt = subtractDays(new Date(), randomInt(14, 45));
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, index++),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: true,
        status: ParticipantStatus.TRAVEL_GRANT,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: true,
        travelGrantApproved: true,
        travelGrantAppliedAt: appliedAt,
        travelGrantDecidedAt: addDays(appliedAt, randomInt(1, 7)),
        notes: 'Travel grant approved - Funding confirmed',
        createdAt: subtractDays(new Date(), randomInt(45, 90)),
      });
    }

    // 15 Rejected
    for (let i = 0; i < 15; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const appliedAt = subtractDays(new Date(), randomInt(14, 45));
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, index++),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: Math.random() > 0.3, // Some rejected applicants become inactive
        status: ParticipantStatus.TRAVEL_GRANT,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: true,
        travelGrantApproved: false,
        travelGrantAppliedAt: appliedAt,
        travelGrantDecidedAt: addDays(appliedAt, randomInt(1, 7)),
        notes: 'Travel grant not approved',
        createdAt: subtractDays(new Date(), randomInt(45, 90)),
      });
    }

    // =========================================================================
    // 100 Regular Participants
    // =========================================================================
    console.log('   Creating 100 Regular Participants...');
    for (let i = 0; i < 100; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, index++),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: Math.random() > 0.08, // 92% active
        status: ParticipantStatus.REGULAR,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: false,
        travelGrantApproved: null,
        notes: 'Regular conference attendee',
        createdAt: subtractDays(new Date(), randomInt(7, 120)),
      });
    }

    const createdParticipants =
      await this.participantModel.insertMany(participants);

    // =========================================================================
    // Assign referrals to ambassadors
    // =========================================================================
    console.log('   Assigning referrals to ambassadors...');
    const ambassadors = createdParticipants.filter(
      (p) => p.status === ParticipantStatus.AMBASSADOR,
    );
    const regularParticipants = createdParticipants.filter(
      (p) => p.status === ParticipantStatus.REGULAR,
    );

    // Distribute referrals - top ambassadors get more
    let referralIndex = 0;
    for (
      let i = 0;
      i < ambassadors.length && referralIndex < regularParticipants.length;
      i++
    ) {
      const ambassador = ambassadors[i];
      // Top ambassadors (0-9) get 3-5 referrals, mid (10-19) get 2-3, lower get 0-2
      const tier = Math.floor(i / 10);
      const maxReferrals = [5, 3, 2, 1][tier] || 1;
      const numReferrals = randomInt(0, maxReferrals);

      if (
        numReferrals > 0 &&
        referralIndex + numReferrals <= regularParticipants.length
      ) {
        const referredIds = regularParticipants
          .slice(referralIndex, referralIndex + numReferrals)
          .map((p) => p._id);

        await this.participantModel.findByIdAndUpdate(ambassador._id, {
          referredParticipantIds: referredIds,
          ambassadorPoints: numReferrals * 10 + randomInt(0, 20), // 10 points per referral + bonus
        });

        referralIndex += numReferrals;
      }
    }

    console.log(`✅ Created ${createdParticipants.length} participants`);
    console.log(`   - 40 Ambassadors`);
    console.log(
      `   - 60 Travel Grant Applicants (20 pending, 25 approved, 15 rejected)`,
    );
    console.log(`   - 100 Regular Participants`);

    return createdParticipants;
  }

  async seedSessions(): Promise<any[]> {
    console.log('\n📅 Seeding Sessions (30 records)...');

    const baseDate = new Date();
    baseDate.setHours(8, 0, 0, 0);

    const sessions: any[] = SESSION_TEMPLATES.map((template, index) => {
      const dayOffset = template.day - 1;
      const hourOffset = (index % 8) * 1.5; // Stagger sessions throughout the day
      const startTime = addHours(addDays(baseDate, dayOffset), 9 + hourOffset);
      const duration = template.name.includes('Workshop')
        ? 2
        : template.name.includes('Keynote')
          ? 1.5
          : template.name.includes('Reception')
            ? 3
            : 1;
      const endTime = addHours(startTime, duration);

      return {
        name: template.name,
        description: `${template.name} - Join us for this engaging session featuring expert speakers, interactive discussions, and networking opportunities. Perfect for researchers, practitioners, and enthusiasts alike.`,
        startTime,
        endTime,
        location: template.location,
        isOpen: index < 10, // First 10 sessions are open for check-in
        capacity: template.capacity,
        capacityEnforced: template.capacity < 100, // Enforce capacity for smaller sessions
        requiresRegistration:
          template.name.includes('Workshop') ||
          template.name.includes('Hackathon'),
        checkInsCount: 0,
        day: template.day,
      };
    });

    const createdSessions = await this.sessionModel.insertMany(sessions);
    console.log(`✅ Created ${createdSessions.length} sessions`);
    console.log(`   - 10 sessions currently open for check-in`);
    console.log(`   - Sessions spread across 4 days`);

    return createdSessions;
  }

  async seedRegistrations(
    participants: any[],
    sessions: any[],
  ): Promise<any[]> {
    console.log('\n📝 Seeding Registrations (400+ records)...');

    const registrations: any[] = [];
    const activeParticipants = participants.filter((p) => p.isActive);
    const usedCombinations = new Set<string>();

    // Each active participant registers for 2-6 sessions
    for (const participant of activeParticipants) {
      const numSessions = randomInt(2, 6);
      const selectedSessions = randomElements(sessions, numSessions);

      for (const session of selectedSessions) {
        const key = `${participant._id}-${session._id}`;
        if (usedCombinations.has(key)) continue;
        usedCombinations.add(key);

        const status =
          Math.random() > 0.15
            ? RegistrationStatus.CONFIRMED
            : Math.random() > 0.5
              ? RegistrationStatus.PENDING
              : RegistrationStatus.CANCELLED;

        registrations.push({
          participantId: participant._id,
          sessionId: session._id,
          registrationDate: subtractDays(new Date(), randomInt(1, 30)),
          status,
          notes:
            status === RegistrationStatus.CANCELLED
              ? 'Schedule conflict'
              : undefined,
        });
      }
    }

    const createdRegistrations =
      await this.registrationModel.insertMany(registrations);

    const confirmed = createdRegistrations.filter(
      (r) => r.status === RegistrationStatus.CONFIRMED,
    ).length;
    const pending = createdRegistrations.filter(
      (r) => r.status === RegistrationStatus.PENDING,
    ).length;
    const cancelled = createdRegistrations.filter(
      (r) => r.status === RegistrationStatus.CANCELLED,
    ).length;

    console.log(`✅ Created ${createdRegistrations.length} registrations`);
    console.log(`   - Confirmed: ${confirmed}`);
    console.log(`   - Pending: ${pending}`);
    console.log(`   - Cancelled: ${cancelled}`);

    return createdRegistrations;
  }

  async seedCheckIns(
    participants: any[],
    sessions: any[],
    registrations: any[],
  ): Promise<any[]> {
    console.log('\n✅ Seeding Check-ins (300+ records)...');

    const checkIns: any[] = [];
    const openSessions = sessions.filter((s) => s.isOpen);
    const usedCombinations = new Set<string>();

    // Create check-ins based on registrations for open sessions
    for (const session of openSessions) {
      // Get registrations for this session
      const sessionRegistrations = registrations.filter(
        (r) =>
          r.sessionId.toString() === session._id.toString() &&
          r.status === RegistrationStatus.CONFIRMED,
      );

      // 70-90% of registered participants check in
      const checkInRate = 0.7 + Math.random() * 0.2;
      const numCheckIns = Math.floor(sessionRegistrations.length * checkInRate);
      const checkingInRegistrations = randomElements(
        sessionRegistrations,
        numCheckIns,
      );

      for (const registration of checkingInRegistrations) {
        const key = `${registration.participantId}-${session._id}`;
        if (usedCombinations.has(key)) continue;
        usedCombinations.add(key);

        const method =
          Math.random() > 0.3 ? CheckInMethod.QR : CheckInMethod.MANUAL;
        const minutesAfterStart = randomInt(-5, 30); // -5 to +30 mins from session start
        const isLate = minutesAfterStart > 10;

        checkIns.push({
          participantId: registration.participantId,
          sessionId: session._id,
          checkInTime: addMinutes(session.startTime, minutesAfterStart),
          method,
          checkedInBy:
            method === CheckInMethod.MANUAL ? 'Staff Member' : undefined,
          isLate,
          notes: isLate ? 'Late arrival' : undefined,
        });
      }

      // Also add some walk-ins (participants who didn't register but showed up)
      const activeParticipants = participants.filter((p) => p.isActive);
      const walkInCount = randomInt(5, 15);
      const walkIns = randomElements(activeParticipants, walkInCount);

      for (const participant of walkIns) {
        const key = `${participant._id}-${session._id}`;
        if (usedCombinations.has(key)) continue;
        usedCombinations.add(key);

        checkIns.push({
          participantId: participant._id,
          sessionId: session._id,
          checkInTime: addMinutes(session.startTime, randomInt(0, 45)),
          method: Math.random() > 0.5 ? CheckInMethod.QR : CheckInMethod.MANUAL,
          isLate: Math.random() > 0.7,
          notes: 'Walk-in attendee',
        });
      }
    }

    const createdCheckIns = await this.checkInModel.insertMany(checkIns);

    // Update session check-in counts
    const checkInCounts = new Map<string, number>();
    for (const checkIn of createdCheckIns) {
      const sessionId = checkIn.sessionId.toString();
      checkInCounts.set(sessionId, (checkInCounts.get(sessionId) || 0) + 1);
    }

    for (const [sessionId, count] of checkInCounts) {
      await this.sessionModel.findByIdAndUpdate(sessionId, {
        checkInsCount: count,
      });
    }

    const qrCount = createdCheckIns.filter(
      (c) => c.method === CheckInMethod.QR,
    ).length;
    const manualCount = createdCheckIns.filter(
      (c) => c.method === CheckInMethod.MANUAL,
    ).length;
    const lateCount = createdCheckIns.filter((c) => c.isLate).length;

    console.log(`✅ Created ${createdCheckIns.length} check-ins`);
    console.log(`   - QR code: ${qrCount}`);
    console.log(`   - Manual: ${manualCount}`);
    console.log(`   - Late arrivals: ${lateCount}`);

    return createdCheckIns;
  }

  async run(): Promise<void> {
    console.log('🌱 Starting High-Density Database Seed...\n');
    console.log('═'.repeat(60));

    try {
      await this.clearAll();

      const participants = await this.seedParticipants();
      const sessions = await this.seedSessions();
      const registrations = await this.seedRegistrations(
        participants,
        sessions,
      );
      await this.seedCheckIns(participants, sessions, registrations);

      console.log('\n' + '═'.repeat(60));
      console.log('🎉 High-density database seeding completed successfully!');
      console.log('\n📊 Final Summary:');

      const totalParticipants = await this.participantModel.countDocuments();
      const totalSessions = await this.sessionModel.countDocuments();
      const totalRegistrations = await this.registrationModel.countDocuments();
      const totalCheckIns = await this.checkInModel.countDocuments();

      console.log(`   📌 Participants: ${totalParticipants}`);
      console.log(`   📌 Sessions: ${totalSessions}`);
      console.log(`   📌 Registrations: ${totalRegistrations}`);
      console.log(`   📌 Check-ins: ${totalCheckIns}`);

      console.log('\n🏆 Ambassador Leaderboard (Top 10):');
      const leaderboard = await this.participantModel
        .find({ status: ParticipantStatus.AMBASSADOR })
        .sort({ ambassadorPoints: -1 })
        .limit(10)
        .lean();

      leaderboard.forEach((amb: any, idx) => {
        console.log(
          `   ${idx + 1}. ${amb.name} - ${amb.ambassadorPoints} pts (${amb.referredParticipantIds.length} referrals)`,
        );
      });

      console.log('\n🎫 Travel Grant Status:');
      const pending = await this.participantModel.countDocuments({
        status: ParticipantStatus.TRAVEL_GRANT,
        travelGrantApproved: null,
      });
      const approved = await this.participantModel.countDocuments({
        status: ParticipantStatus.TRAVEL_GRANT,
        travelGrantApproved: true,
      });
      const rejected = await this.participantModel.countDocuments({
        status: ParticipantStatus.TRAVEL_GRANT,
        travelGrantApproved: false,
      });
      console.log(`   ⏳ Pending: ${pending}`);
      console.log(`   ✅ Approved: ${approved}`);
      console.log(`   ❌ Rejected: ${rejected}`);

      console.log('\n📅 Session Status:');
      const openSessions = await this.sessionModel.countDocuments({
        isOpen: true,
      });
      const closedSessions = await this.sessionModel.countDocuments({
        isOpen: false,
      });
      console.log(`   🟢 Open: ${openSessions}`);
      console.log(`   🔴 Closed: ${closedSessions}`);

      console.log('\n' + '═'.repeat(60));
      console.log('✨ Your dashboard is now populated with high-density data!');
      console.log('═'.repeat(60));
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);

  const participantModel =
    app.get<Model<ParticipantDocument>>('ParticipantModel');
  const sessionModel = app.get<Model<SessionDocument>>('SessionModel');
  const checkInModel = app.get<Model<CheckInDocument>>('CheckInModel');
  const registrationModel =
    app.get<Model<RegistrationDocument>>('RegistrationModel');

  const seeder = new Seeder(
    participantModel,
    sessionModel,
    checkInModel,
    registrationModel,
  );

  await seeder.run();
  await app.close();
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('Fatal error during seeding:', error);
  process.exit(1);
});
