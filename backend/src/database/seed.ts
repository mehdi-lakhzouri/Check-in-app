/**
 * Database Seed Script
 * Creates 20 test records per table to test the admin dashboard logic
 * 
 * Run with: npm run seed
 */

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigModule } from '@nestjs/config';
import { 
  Participant, 
  ParticipantSchema, 
  ParticipantDocument,
  ParticipantStatus 
} from '../modules/participants/schemas';
import { 
  Session, 
  SessionSchema, 
  SessionDocument 
} from '../modules/sessions/schemas';
import { 
  CheckIn, 
  CheckInSchema, 
  CheckInDocument,
  CheckInMethod 
} from '../modules/checkins/schemas';
import { 
  Registration, 
  RegistrationSchema, 
  RegistrationDocument,
  RegistrationStatus 
} from '../modules/registrations/schemas';
import databaseConfig from '../config/database.config';

// ============================================================================
// Seed Data Arrays
// ============================================================================

const ORGANIZATIONS = [
  'MIT', 'Stanford University', 'Harvard Medical', 'Oxford Research',
  'Cambridge Labs', 'Yale Institute', 'Princeton Tech', 'Berkeley AI',
  'Caltech Innovation', 'Columbia University', 'Duke Medical Center',
  'Johns Hopkins', 'UCLA Research', 'University of Tokyo', 'ETH Zurich',
  'Imperial College', 'CERN', 'Max Planck Institute', 'Tsinghua University',
  'National Institutes of Health'
];

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'James', 'Sophia', 'Oliver',
  'Isabella', 'William', 'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia',
  'Henry', 'Harper', 'Alexander', 'Evelyn', 'Sebastian', 'Luna', 'Daniel',
  'Aria', 'Michael', 'Chloe', 'Ethan', 'Penelope', 'Matthew', 'Layla', 'Aiden'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const SESSION_NAMES = [
  'Opening Ceremony & Welcome Address',
  'Keynote: The Future of AI in Healthcare',
  'Workshop: Machine Learning Fundamentals',
  'Panel Discussion: Ethics in Research',
  'Networking Lunch Session',
  'Technical Deep Dive: Neural Networks',
  'Poster Presentation Session A',
  'Industry Showcase: Innovations 2025',
  'Breakout Room: Collaborative Projects',
  'Hands-on Lab: Data Analysis',
  'Expert Talk: Quantum Computing',
  'Case Study: Real-world Applications',
  'Interactive Q&A: Research Challenges',
  'Workshop: Paper Writing Tips',
  'Startup Pitch Competition',
  'Community Building Session',
  'Award Ceremony & Recognition',
  'Special Interest Group Meeting',
  'Career Development Workshop',
  'Closing Ceremony & Farewell'
];

const SESSION_LOCATIONS = [
  'Main Auditorium', 'Conference Hall A', 'Conference Hall B', 'Workshop Room 1',
  'Workshop Room 2', 'Innovation Lab', 'Rooftop Garden', 'Executive Suite',
  'Collaboration Space', 'Virtual Room 1'
];

// ============================================================================
// Helper Functions
// ============================================================================

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateQRCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'QR-';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ['gmail.com', 'outlook.com', 'university.edu', 'research.org', 'company.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${randomElement(domains)}`;
}

function generatePhone(): string {
  return `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

// ============================================================================
// Seed Module
// ============================================================================

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/iastam-checkin'),
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
// Seeder Service
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
    console.log('\n👥 Seeding Participants (20 records)...');
    
    const participants: any[] = [];
    
    // Create 5 Ambassadors with referrals and points
    for (let i = 0; i < 5; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, i),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: true,
        status: ParticipantStatus.AMBASSADOR,
        ambassadorPoints: (5 - i) * 30, // Points: 150, 120, 90, 60, 30
        referredParticipantIds: [], // Will be filled later
        travelGrantApplied: false,
        travelGrantApproved: null,
        notes: `Top Ambassador #${i + 1} - Active referral program member`,
      });
    }

    // Create 8 Travel Grant Applicants (various states)
    // 3 Pending
    for (let i = 0; i < 3; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, i + 5),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: true,
        status: ParticipantStatus.TRAVEL_GRANT,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: true,
        travelGrantApproved: null, // Pending
        travelGrantAppliedAt: subtractDays(new Date(), Math.floor(Math.random() * 7) + 1),
        notes: 'Travel grant application pending review',
      });
    }

    // 3 Approved
    for (let i = 0; i < 3; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const appliedAt = subtractDays(new Date(), Math.floor(Math.random() * 14) + 7);
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, i + 8),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: true,
        status: ParticipantStatus.TRAVEL_GRANT,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: true,
        travelGrantApproved: true, // Approved
        travelGrantAppliedAt: appliedAt,
        travelGrantDecidedAt: addDays(appliedAt, Math.floor(Math.random() * 3) + 1),
        notes: 'Travel grant approved - funding confirmed',
      });
    }

    // 2 Rejected
    for (let i = 0; i < 2; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const appliedAt = subtractDays(new Date(), Math.floor(Math.random() * 14) + 7);
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, i + 11),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: true,
        status: ParticipantStatus.TRAVEL_GRANT,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: true,
        travelGrantApproved: false, // Rejected
        travelGrantAppliedAt: appliedAt,
        travelGrantDecidedAt: addDays(appliedAt, Math.floor(Math.random() * 3) + 1),
        notes: 'Travel grant application not approved',
      });
    }

    // Create 7 Regular Participants (will be used as referrals)
    for (let i = 0; i < 7; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      participants.push({
        name: `${firstName} ${lastName}`,
        email: generateEmail(firstName, lastName, i + 13),
        organization: randomElement(ORGANIZATIONS),
        phone: generatePhone(),
        qrCode: generateQRCode(),
        isActive: i < 6, // 1 inactive participant
        status: ParticipantStatus.REGULAR,
        ambassadorPoints: 0,
        referredParticipantIds: [],
        travelGrantApplied: false,
        travelGrantApproved: null,
        notes: i < 6 ? 'Regular conference attendee' : 'Inactive participant - registration cancelled',
      });
    }

    const createdParticipants = await this.participantModel.insertMany(participants);
    
    // Now assign referrals to ambassadors
    const ambassadors = createdParticipants.filter(p => p.status === ParticipantStatus.AMBASSADOR);
    const regularParticipants = createdParticipants.filter(p => p.status === ParticipantStatus.REGULAR);
    
    // Distribute the 7 regular participants among ambassadors
    if (ambassadors.length >= 5 && regularParticipants.length >= 7) {
      await this.participantModel.findByIdAndUpdate(ambassadors[0]._id, {
        referredParticipantIds: [regularParticipants[0]._id, regularParticipants[1]._id, regularParticipants[2]._id],
        ambassadorPoints: 30, // 3 referrals * 10 points
      });
      
      await this.participantModel.findByIdAndUpdate(ambassadors[1]._id, {
        referredParticipantIds: [regularParticipants[3]._id, regularParticipants[4]._id],
        ambassadorPoints: 20, // 2 referrals * 10 points
      });
      
      await this.participantModel.findByIdAndUpdate(ambassadors[2]._id, {
        referredParticipantIds: [regularParticipants[5]._id],
        ambassadorPoints: 10, // 1 referral * 10 points
      });
      
      await this.participantModel.findByIdAndUpdate(ambassadors[3]._id, {
        referredParticipantIds: [regularParticipants[6]._id],
        ambassadorPoints: 10, // 1 referral * 10 points
      });
      
      // Ambassador 5 has no referrals yet
      await this.participantModel.findByIdAndUpdate(ambassadors[4]._id, {
        referredParticipantIds: [],
        ambassadorPoints: 0,
      });
    }

    console.log(`✅ Created ${createdParticipants.length} participants`);
    console.log(`   - 5 Ambassadors (with referral relationships)`);
    console.log(`   - 8 Travel Grant Applicants (3 pending, 3 approved, 2 rejected)`);
    console.log(`   - 7 Regular Participants`);
    
    return createdParticipants;
  }

  async seedSessions(): Promise<any[]> {
    console.log('\n📅 Seeding Sessions (20 records)...');
    
    const baseDate = new Date();
    baseDate.setHours(9, 0, 0, 0);
    
    const sessions: any[] = SESSION_NAMES.map((name, index) => {
      const dayOffset = Math.floor(index / 5); // 5 sessions per day
      const hourOffset = (index % 5) * 2; // 2-hour slots
      const startTime = addHours(addDays(baseDate, dayOffset), hourOffset);
      const endTime = addHours(startTime, 1.5); // 1.5 hour sessions
      
      return {
        name,
        description: `${name} - An engaging session featuring expert speakers and interactive discussions. Join us for this exciting opportunity to learn and network.`,
        startTime,
        endTime,
        location: randomElement(SESSION_LOCATIONS),
        isOpen: index < 5, // First 5 sessions are open for check-in
        capacity: Math.floor(Math.random() * 100) + 50, // 50-150 capacity
        checkInsCount: 0, // Will be updated when we create check-ins
      };
    });

    const createdSessions = await this.sessionModel.insertMany(sessions);
    console.log(`✅ Created ${createdSessions.length} sessions`);
    console.log(`   - 5 sessions currently open for check-in`);
    console.log(`   - Sessions spread across ${Math.ceil(SESSION_NAMES.length / 5)} days`);
    
    return createdSessions;
  }

  async seedRegistrations(
    participants: any[], 
    sessions: any[]
  ): Promise<any[]> {
    console.log('\n📝 Seeding Registrations (20 records)...');
    
    const registrations: any[] = [];
    const activeParticipants = participants.filter(p => p.isActive);
    
    // Each participant registers for 1-3 sessions
    let registrationCount = 0;
    for (const participant of activeParticipants) {
      if (registrationCount >= 20) break;
      
      const numSessions = Math.min(Math.floor(Math.random() * 3) + 1, 20 - registrationCount);
      const shuffledSessions = [...sessions].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numSessions && registrationCount < 20; i++) {
        const session = shuffledSessions[i];
        const statuses = [RegistrationStatus.CONFIRMED, RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING];
        
        registrations.push({
          participantId: participant._id,
          sessionId: session._id,
          registrationDate: subtractDays(new Date(), Math.floor(Math.random() * 14) + 1),
          status: randomElement(statuses),
          notes: Math.random() > 0.7 ? 'Special requirements noted' : undefined,
        });
        registrationCount++;
      }
    }

    const createdRegistrations = await this.registrationModel.insertMany(registrations);
    console.log(`✅ Created ${createdRegistrations.length} registrations`);
    
    return createdRegistrations;
  }

  async seedCheckIns(
    participants: any[], 
    sessions: any[]
  ): Promise<any[]> {
    console.log('\n✅ Seeding Check-ins (20 records)...');
    
    const checkIns: any[] = [];
    const activeParticipants = participants.filter(p => p.isActive);
    const openSessions = sessions.filter(s => s.isOpen);
    
    let checkInCount = 0;
    const usedCombinations = new Set<string>();
    
    // Create check-ins for open sessions
    for (const session of openSessions) {
      if (checkInCount >= 20) break;
      
      const numCheckIns = Math.min(Math.floor(Math.random() * 5) + 2, 20 - checkInCount);
      const shuffledParticipants = [...activeParticipants].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numCheckIns && checkInCount < 20; i++) {
        const participant = shuffledParticipants[i];
        const combinationKey = `${participant._id}-${session._id}`;
        
        if (usedCombinations.has(combinationKey)) continue;
        usedCombinations.add(combinationKey);
        
        const methods = [CheckInMethod.QR, CheckInMethod.QR, CheckInMethod.MANUAL];
        
        checkIns.push({
          participantId: participant._id,
          sessionId: session._id,
          checkInTime: addHours(session.startTime, Math.random() * 0.5), // Check in within first 30 mins
          method: randomElement(methods),
          checkedInBy: Math.random() > 0.5 ? 'Admin Staff' : undefined,
          notes: Math.random() > 0.8 ? 'Late arrival' : undefined,
        });
        checkInCount++;
      }
    }

    const createdCheckIns = await this.checkInModel.insertMany(checkIns);
    
    // Update session check-in counts
    const checkInCounts = new Map<string, number>();
    for (const checkIn of createdCheckIns) {
      if (checkIn.sessionId) {
        const sessionId = checkIn.sessionId.toString();
        checkInCounts.set(sessionId, (checkInCounts.get(sessionId) || 0) + 1);
      }
    }
    
    for (const [sessionId, count] of checkInCounts) {
      await this.sessionModel.findByIdAndUpdate(sessionId, { checkInsCount: count });
    }

    console.log(`✅ Created ${createdCheckIns.length} check-ins`);
    console.log(`   - QR code check-ins: ${createdCheckIns.filter(c => c.method === CheckInMethod.QR).length}`);
    console.log(`   - Manual check-ins: ${createdCheckIns.filter(c => c.method === CheckInMethod.MANUAL).length}`);
    
    return createdCheckIns;
  }

  async run(): Promise<void> {
    console.log('🌱 Starting Database Seed...\n');
    console.log('=' .repeat(50));
    
    try {
      await this.clearAll();
      
      const participants = await this.seedParticipants();
      const sessions = await this.seedSessions();
      await this.seedRegistrations(participants, sessions);
      await this.seedCheckIns(participants, sessions);
      
      console.log('\n' + '='.repeat(50));
      console.log('🎉 Database seeding completed successfully!');
      console.log('\n📊 Summary:');
      console.log('   - Participants: 20 (5 ambassadors, 8 travel grant, 7 regular)');
      console.log('   - Sessions: 20 (5 open, 15 scheduled)');
      console.log('   - Registrations: 20');
      console.log('   - Check-ins: 20');
      console.log('\n🔗 Ambassador Leaderboard Preview:');
      
      const leaderboard = await this.participantModel
        .find({ status: ParticipantStatus.AMBASSADOR })
        .sort({ ambassadorPoints: -1 })
        .limit(5)
        .lean();
      
      leaderboard.forEach((amb: any, index) => {
        console.log(`   ${index + 1}. ${amb.name} - ${amb.ambassadorPoints} points (${amb.referredParticipantIds.length} referrals)`);
      });
      
      console.log('\n📋 Travel Grant Status:');
      const pending = await this.participantModel.countDocuments({ 
        status: ParticipantStatus.TRAVEL_GRANT, 
        travelGrantApproved: null 
      });
      const approved = await this.participantModel.countDocuments({ 
        status: ParticipantStatus.TRAVEL_GRANT, 
        travelGrantApproved: true 
      });
      const rejected = await this.participantModel.countDocuments({ 
        status: ParticipantStatus.TRAVEL_GRANT, 
        travelGrantApproved: false 
      });
      console.log(`   - Pending: ${pending}`);
      console.log(`   - Approved: ${approved}`);
      console.log(`   - Rejected: ${rejected}`);
      
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
  
  const participantModel = app.get<Model<ParticipantDocument>>('ParticipantModel');
  const sessionModel = app.get<Model<SessionDocument>>('SessionModel');
  const checkInModel = app.get<Model<CheckInDocument>>('CheckInModel');
  const registrationModel = app.get<Model<RegistrationDocument>>('RegistrationModel');
  
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
