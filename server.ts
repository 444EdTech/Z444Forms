import express from "express";
console.log(">>> SERVER PROCESS STARTING <<<");
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Local File-Based database fallback directory
const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create DATA_DIR:", err);
  }
}
const REGISTRATIONS_FILE = path.join(DATA_DIR, "registrations.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedbacks.json");
const COMMUNITY_FILE = path.join(DATA_DIR, "community.json");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "home_submissions.json");

// Multi-layered in-memory fallback for serverless container lifespans
const inMemoryRegistrations: any[] = [];
const inMemoryFeedbacks: any[] = [];
const inMemoryCommunity: any[] = [];
const inMemorySubmissions: any[] = [];

interface BroadcastProgress {
  id: string; // 'urgency' or 'forms'
  total: number;
  processed: number;
  sentCount: number;
  failedCount: number;
  status: "idle" | "running" | "completed" | "failed";
  errors: Array<{ email: string; name: string; error: string; timestamp: string }>;
  startTime?: string;
  endTime?: string;
}

const activeBroadcasts: Record<string, BroadcastProgress> = {
  urgency: { id: "urgency", total: 0, processed: 0, sentCount: 0, failedCount: 0, status: "idle", errors: [] },
  forms: { id: "forms", total: 0, processed: 0, sentCount: 0, failedCount: 0, status: "idle", errors: [] }
};

app.get("/api/broadcast-status", (req, res) => {
  res.json({ success: true, broadcasts: activeBroadcasts });
});

// Helper to load registrations locally
function loadLocalRegistrations(): any[] {
  let list: any[] = [];
  if (fs.existsSync(REGISTRATIONS_FILE)) {
    try {
      const data = fs.readFileSync(REGISTRATIONS_FILE, "utf-8");
      list = JSON.parse(data);
    } catch (e) {
      console.error("Error reading local registrations:", e);
    }
  }

  // Merge with process-level in-memory cache to maintain durability during warm container lifespan
  const merged = [...list];
  for (const item of inMemoryRegistrations) {
    if (!merged.some(m => m.id === item.id)) {
      merged.push(item);
    }
  }
  return merged;
}

// Helper to save registrations locally
function saveLocalRegistration(registration: any) {
  // Always register in container-level in-memory cache
  if (!inMemoryRegistrations.some(m => m.id === registration.id)) {
    inMemoryRegistrations.push(registration);
  }

  try {
    const all = loadLocalRegistrations();
    if (!all.some(m => m.id === registration.id)) {
      all.push(registration);
    }
    fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write check-in record to backup file:", err);
  }
}

// Helper to load feedbacks locally
function loadLocalFeedbacks(): any[] {
  let list: any[] = [];
  if (fs.existsSync(FEEDBACK_FILE)) {
    try {
      const data = fs.readFileSync(FEEDBACK_FILE, "utf-8");
      list = JSON.parse(data);
    } catch (e) {
      console.error("Error reading local feedbacks:", e);
    }
  }

  const merged = [...list];
  for (const item of inMemoryFeedbacks) {
    if (!merged.some(m => m.id === item.id)) {
      merged.push(item);
    }
  }
  return merged;
}

// Helper to save feedbacks locally
function saveLocalFeedback(feedback: any) {
  if (!inMemoryFeedbacks.some(m => m.id === feedback.id)) {
    inMemoryFeedbacks.push(feedback);
  }

  try {
    const all = loadLocalFeedbacks();
    if (!all.some(m => m.id === feedback.id)) {
      all.push(feedback);
    }
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write feedback record to backup file:", err);
  }
}

// Helpers for WhatsApp Community local storage backup
function loadLocalCommunity(): any[] {
  let list: any[] = [];
  if (fs.existsSync(COMMUNITY_FILE)) {
    try {
      const data = fs.readFileSync(COMMUNITY_FILE, "utf-8");
      list = JSON.parse(data);
    } catch (e) {
      console.error("Error reading local community records:", e);
    }
  }

  const merged = [...list];
  for (const item of inMemoryCommunity) {
    if (!merged.some(m => m.id === item.id)) {
      merged.push(item);
    }
  }
  return merged;
}

function saveLocalCommunity(item: any) {
  if (!inMemoryCommunity.some(m => m.id === item.id)) {
    inMemoryCommunity.push(item);
  } else {
    const idx = inMemoryCommunity.findIndex(m => m.id === item.id);
    if (idx >= 0) inMemoryCommunity[idx] = item;
  }

  try {
    const all = loadLocalCommunity();
    const idx = all.findIndex(m => m.id === item.id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.push(item);
    }
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write community record to backup file:", err);
  }
}

// Helpers for Home Submissions local storage backup
function loadLocalSubmissions(): any[] {
  let list: any[] = [];
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    try {
      const data = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
      list = JSON.parse(data);
    } catch (e) {
      console.error("Error reading local submissions records:", e);
    }
  }

  const merged = [...list];
  for (const item of inMemorySubmissions) {
    if (!merged.some(m => m.id === item.id)) {
      merged.push(item);
    }
  }
  return merged;
}

function saveLocalSubmission(item: any) {
  if (!inMemorySubmissions.some(m => m.id === item.id)) {
    inMemorySubmissions.push(item);
  } else {
    const idx = inMemorySubmissions.findIndex(m => m.id === item.id);
    if (idx >= 0) inMemorySubmissions[idx] = item;
  }

  try {
    const all = loadLocalSubmissions();
    const idx = all.findIndex(m => m.id === item.id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.push(item);
    }
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write submission record to backup file:", err);
  }
}

// Helper to generate a valid iCalendar (RFC 5545) event invite
function generateIcalEvent(studentName: string, studentEmail: string, eventId: string): string {
  // Current timestamp formatted for iCal UTC compliance
  const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  // June 7, 2026 11:00 AM IST => 05:30:00 UTC
  const dtStart = "20260607T053000Z";
  // June 7, 2026 1:00 PM IST => 07:30:00 UTC
  const dtEnd = "20260607T073000Z";

  // Escape text for ICS format
  const summary = "Z444 Masterclass: Bridging the Gap between College & Industry";
  const organizerDisplay = "Z444 Masterclass Team";
  const studentDisplay = studentName.replace(/[\\,;]/g, "\\$&"); // Escape backslash, comma, semicolon

  const description = [
    `Dear ${studentName},`,
    "",
    "Your direct admission seat at the upcoming Z444 Masterclass is officially secured!",
    "",
    "📅 Masterclass Agenda & Access:",
    "Date: Sunday, June 7th, 2026",
    "Time: 11:00 AM IST (Indian Standard Time) Sharp",
    "Live Platform: Google Meet Classroom",
    "Direct Join URL: https://meet.google.com/bwi-xehm-peg",
    "",
    "💡 Topics Covered:",
    "- Classroom Theory to Engineering Output Transition Workflows",
    "- Direct Outreach, Cold Emailing, and LinkedIn mapping Workflows",
    "- Designing A-grade, high-yield Engineering Resume structures",
    "- Top Practical stacks and skills needed to pass Technical Screenings",
    "",
    "Warm regards,",
    "Z444 masterclass team"
  ].join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Z444 Masterclass Team//NONSGML Z444 Portal v1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:uid-z444-${eventId || Date.now()}@444edtech.gmail.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "LOCATION:https://meet.google.com/bwi-xehm-peg",
    `ORGANIZER;CN="${organizerDisplay}":mailto:444edtech@gmail.com`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${studentDisplay}":mailto:${studentEmail}`,
    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Z444 Masterclass starts in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

// Let's declare our diagnostics object to safely identify cloud database status on production hosts (e.g. Vercel)
const firebaseDiagnostics: {
  initialized: boolean;
  projectId: string | null;
  databaseId: string | null;
  hasServiceAccountEnv: boolean;
  serviceAccountEnvLength: number;
  hasClientEmailEnv: boolean;
  hasPrivateKeyEnv: boolean;
  hasFirebaseConfigFile: boolean;
  initAttempted: boolean;
  initSuccess: boolean;
  initError: string | null;
  serviceAccountParseError: string | null;
  isServiceAccountValidJson: boolean;
  detectedCredentialType: string;
  actualDbNull: boolean;
  lastFetchAttemptTime: string | null;
  lastFetchSuccess: boolean;
  lastFetchError: string | null;
  lastFetchCount: number;
} = {
  initialized: false,
  projectId: null,
  databaseId: null,
  hasServiceAccountEnv: !!process.env.FIREBASE_SERVICE_ACCOUNT,
  serviceAccountEnvLength: process.env.FIREBASE_SERVICE_ACCOUNT ? process.env.FIREBASE_SERVICE_ACCOUNT.length : 0,
  hasClientEmailEnv: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKeyEnv: !!process.env.FIREBASE_PRIVATE_KEY,
  hasFirebaseConfigFile: false,
  initAttempted: false,
  initSuccess: false,
  initError: null,
  serviceAccountParseError: null,
  isServiceAccountValidJson: false,
  detectedCredentialType: "none",
  actualDbNull: true,
  lastFetchAttemptTime: null,
  lastFetchSuccess: false,
  lastFetchError: null,
  lastFetchCount: 0
};

// Initialize Firebase Admin if config exists or env vars are present
let firestoreDb: any = null;
const envProjectId = process.env.FIREBASE_PROJECT_ID;
const envDatabaseId = process.env.FIREBASE_DATABASE_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

let projectId: string | undefined = envProjectId;
let databaseId: string | undefined = envDatabaseId || "(default)";
let credentialOption: any = undefined;

// 1. Try working with FIREBASE_SERVICE_ACCOUNT JSON:
if (serviceAccountJson) {
  try {
    const parsedCreds = JSON.parse(serviceAccountJson);
    firebaseDiagnostics.isServiceAccountValidJson = true;
    firebaseDiagnostics.detectedCredentialType = "service_account_json";
    credentialOption = admin.credential.cert(parsedCreds);
    if (parsedCreds.project_id) {
      projectId = parsedCreds.project_id;
      // Use the explicitly configured database ID if present, otherwise default to "(default)"
      databaseId = envDatabaseId || "(default)";
    }
  } catch (jsonErr: any) {
    firebaseDiagnostics.serviceAccountParseError = jsonErr?.message || String(jsonErr);
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", jsonErr);
  }
}

// 2. Try working with separate Service Account variables:
if (!credentialOption && clientEmail && privateKey) {
  firebaseDiagnostics.detectedCredentialType = "separate_service_account_env";
  if (!projectId && clientEmail.includes("@")) {
    projectId = clientEmail.split("@")[1]?.split(".")[0];
  }
  credentialOption = admin.credential.cert({
    projectId: projectId,
    clientEmail: clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  });
}

// 3. Fallback to parsing firebase-applet-config.json if no credentials set via env
if (!projectId) {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseDiagnostics.hasFirebaseConfigFile = true;
    try {
      const rawConfig = fs.readFileSync(firebaseConfigPath, "utf-8");
      const firebaseConfig = JSON.parse(rawConfig);
      projectId = firebaseConfig.projectId;
      databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
    } catch (error) {
      console.error("Failed to initialize Firebase Admin from firebase-applet-config.json:", error);
    }
  }
}

firebaseDiagnostics.projectId = projectId || null;
firebaseDiagnostics.databaseId = databaseId || null;

// Ensure we have a projectId to initialize
if (projectId) {
  firebaseDiagnostics.initAttempted = true;
  try {
    let appInstance;
    
    // Choose a unique app name based on the projectId to avoid reusing a sandbox/different [DEFAULT] app
    const appName = projectId === envProjectId ? "[DEFAULT]" : `custom_${projectId.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const existingApp = admin.apps.find(app => app.name === appName);
    
    if (existingApp) {
      appInstance = existingApp;
    } else {
      appInstance = admin.initializeApp({
        projectId: projectId,
        ...(credentialOption ? { credential: credentialOption } : {})
      }, appName);
    }
    
    if (databaseId && databaseId !== "(default)") {
      firestoreDb = getFirestore(appInstance, databaseId);
    } else {
      firestoreDb = getFirestore(appInstance);
    }
    firebaseDiagnostics.initialized = true;
    firebaseDiagnostics.initSuccess = true;
    firebaseDiagnostics.actualDbNull = false;
    console.log(`Firebase Admin initialized successfully (Project: ${projectId}, Database: ${databaseId}, AppName: ${appName})`);
  } catch (error: any) {
    firebaseDiagnostics.initError = error?.message || String(error);
    console.error("Failed to initialize Firebase Admin:", error);
  }
} else {
  console.log("Firebase config not found (no env variables or firebase-applet-config.json found). Backend will operate using local JSON backup.");
}

// Initialize Gemini SDK with lazy validation
let ai: GoogleGenAI | null = null;
const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({ apiKey: geminiKey });
    console.log("Gemini AI initialized on backend");
  } catch (error) {
    console.error("Failed to initialize Gemini Client:", error);
  }
}

// --- API ROUTES ---

// Submit Feedback
async function handlePostFeedback(req: any, res: any) {
  try {
    const { name, email, rating, comments, willingToJoinCommunity } = req.body;

    // Server-side strict validations
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid student name. Must be 1-100 characters." });
    }
    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".") || email.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid email ID. Please input a valid student email." });
    }
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5." });
    }
    if (!comments || typeof comments !== "string" || comments.trim().length === 0 || comments.length > 2000) {
      return res.status(400).json({ success: false, message: "Invalid comments. Must be 1-[2000] characters." });
    }

    const feedbackId = "fb_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const feedbackItem = {
      id: feedbackId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      rating: numRating,
      comments: comments.trim(),
      willingToJoinCommunity: Boolean(willingToJoinCommunity),
      createdAt: new Date().toISOString()
    };

    // 1. Save Locally (backup)
    saveLocalFeedback(feedbackItem);

    // 2. Save securely to Cloud DB
    let savedToCloud = false;
    if (firestoreDb) {
      try {
        const docRef = firestoreDb.collection("feedbacks").doc(feedbackId);
        await docRef.set({
          ...feedbackItem,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        savedToCloud = true;
        console.log(`Saved feedback ${feedbackId} securely to Cloud Firestore`);
      } catch (firestoreError: any) {
        console.error("Firestore feedback sync notification:", firestoreError?.message || firestoreError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Successfully received feedback entry!",
      data: feedbackItem,
      cloudSync: savedToCloud
    });
  } catch (err: any) {
    console.error("Error in feedback submission:", err);
    return res.status(500).json({ success: false, message: "Internal server error occurred when submitting feedback." });
  }
}
app.post("/feedbackform", handlePostFeedback);
app.post("/api/feedbackform", handlePostFeedback);

// Submit Registration
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, phone, btechYear, department } = req.body;

    // Server-side strict validations
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid student name. Must be 1-100 characters." });
    }
    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".") || email.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid email ID. Please input a valid student email." });
    }
    const phoneRegex = /^[+]?[0-9\s\-()]{8,15}$/;
    if (!phone || typeof phone !== "string" || !phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number. Must be between 8 and 15 digits." });
    }
    const validYears = ["1", "2", "3", "4", "Completed"];
    if (!btechYear || !validYears.includes(btechYear)) {
      return res.status(400).json({ success: false, message: "B.Tech year must be 1, 2, 3, 4, or Completed." });
    }
    if (!department || typeof department !== "string" || department.trim().length === 0 || department.length > 50) {
      return res.status(400).json({ success: false, message: "Invalid department name. Must be 1-50 characters." });
    }

    const registrationId = "reg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const registrationItem = {
      id: registrationId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      btechYear,
      department: department.trim(),
      createdAt: new Date().toISOString()
    };

    // 1. Save Locally (Durable backup fallback)
    saveLocalRegistration(registrationItem);

    // 2. Prepare Confirming Email directly using data provided (deterministic & extremely fast)
    let emailSubject = "Confirmed: Z444 Masterclass Admission & Direct Entry Link - June 7th 11:00 AM IST";
    
    let emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
        <!-- Header block with elegant dark styling matching registration theme -->
        <div style="background-color: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; tracking-wider: 0.1em; margin-bottom: 12px;">ADMISSION CONFIRMED</div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #f8fafc; tracking-tight: -0.025em;">Z444 Live Masterclass invite</h1>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13.5px;">Custom path: College Theory to authentic engineering standards</p>
        </div>
        
        <div style="padding: 28px; background-color: #ffffff;">
          <p style="font-size: 16px; font-weight: 700; margin-top: 0; color: #0f172a;">Dear ${registrationItem.name},</p>
          <p style="margin-top: 4px; font-size: 14.5px; color: #334155;">Fantastic news! Your reservation is official, and your virtual admission seat for the upcoming <strong>Z444 Masterclass</strong> is securely locked in.</p>
          
          <!-- Student particulars database readout badge block -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; font-size: 11.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Your Registration Record:</h3>
            <table style="width: 100%; font-size: 13.5px; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 35%;">Department:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${registrationItem.department}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: 500;">B.Tech Study Year:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">Year ${registrationItem.btechYear}</td>
              </tr>
            </table>
          </div>

          <!-- Join masterclass primary notice card -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 18px; margin: 24px 0; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-weight: 800; color: #1e40af; font-size: 13px; text-transform: uppercase; tracking-wider: 0.05em;">⚡ Access Details:</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #1e293b;">
              🗓️ <strong>Date:</strong> Sunday, June 7th, 2026<br>
              ⏰ <strong>Time:</strong> 11:00 AM Indian Standard Time (IST) Sharp<br>
              📍 <strong>Live Venue:</strong> Google Meet Virtual Room<br>
              🔗 <strong>Direct URL Link:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #2563eb; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
            </p>
          </div>

          <!-- Add to Calendar Action Button -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Z444+Masterclass:+Bridging+the+Gap+between+College+%26+Industry&dates=20260607T053000Z/20260607T073000Z&details=Masterclass+to+bridge+the+gap+between+college+learnings+and+true+industry+expectations.+Google+Meet+Link:+https://meet.google.com/bwi-xehm-peg&location=https://meet.google.com/bwi-xehm-peg" 
               style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);">
               📥 Add to Google Calendar Schedule
            </a>
          </div>
          
          <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 24px;">🎯 Key Takeaways We Will Cover Live:</p>
          <ul style="padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.7; margin-top: 8px;">
            <li style="margin-bottom: 6px;">How to structure high-converting **technical resumes** to clear screening algorithms.</li>
            <li style="margin-bottom: 6px;">Mapping authentic engineering roles, tech stacks, and modern internship pipelines.</li>
            <li style="margin-bottom: 6px;">Direct Outreach cold email structures & LinkedIn mapping hacks that secure responses.</li>
            <li style="margin-bottom: 6px;">Overcoming the transition gap from college theory to production-ready industry standards.</li>
          </ul>
          
          <p style="font-weight: 700; color: #0f172a; margin-top: 24px; font-size: 14px;">📝 Guidelines for the Live Class:</p>
          <p style="margin-top: 4px; color: #475569; font-size: 13.5px; line-height: 1.6;">Please join the meet link 5 minutes early to avoid placement buffering. Bring a draft of your resume, a writing notebook, and your absolute focus!</p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;">
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0; text-align: center; line-height: 1.6;">
            Warm regards,<br>
            <strong style="color: #0f172a;">Z444 Masterclass Team</strong><br>
            Need help? Drop an email to <a href="mailto:444edtech@gmail.com" style="color: #4f46e5; text-decoration: underline;">444edtech@gmail.com</a>
          </p>
        </div>
      </div>
    `;

    // 3. Save to Firestore and Dispatch Emails synchronously to guarantee performance and delivery under serverless environments
    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 Masterclass <${smtpUser}>`;

    let emailSent = false;
    let transportDetails = "Log Only";
    let savedToCloud = false;

    if (firestoreDb) {
      try {
        const docRef = firestoreDb.collection("registrations").doc(registrationId);
        await docRef.set({
          ...registrationItem,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        savedToCloud = true;
        console.log(`Saved registration ${registrationId} securely to Cloud Firestore`);
      } catch (firestoreError: any) {
        if (firestoreError?.message?.includes("PERMISSION_DENIED")) {
          console.log("Firestore sync inactive / pending credentials - using local registry backup");
        } else {
          console.log("Firestore sync notification:", firestoreError?.message || firestoreError);
        }
      }
    }

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for other ports e.g. 587
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const icalContent = generateIcalEvent(registrationItem.name, registrationItem.email, registrationItem.id);
        
        // Send to Student
        await transporter.sendMail({
          from: smtpFrom,
          to: registrationItem.email,
          subject: `Confirmed: Z444 Masterclass Direct Entry Invitation - June 7th 11:00 AM IST`,
          html: emailHtml,
          icalEvent: {
            filename: "invite.ics",
            method: "REQUEST",
            content: icalContent
          },
          alternatives: [
            {
              contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
              content: icalContent
            }
          ]
        });

        // Send to Host (Admin Mail)
        await transporter.sendMail({
          from: smtpFrom,
          to: "444edtech@gmail.com",
          subject: `New Z444 Masterclass Sign-up: ${registrationItem.name} (${registrationItem.department})`,
          html: `
            <h3>New Z444 Masterclass Registration received!</h3>
            <p>Here are the student registration details:</p>
            <ul>
              <li><strong>Name:</strong> ${registrationItem.name}</li>
              <li><strong>Email:</strong> ${registrationItem.email}</li>
              <li><strong>Phone:</strong> ${registrationItem.phone}</li>
              <li><strong>B.Tech Year:</strong> ${registrationItem.btechYear}</li>
              <li><strong>Department:</strong> ${registrationItem.department}</li>
              <li><strong>Registrant ID:</strong> ${registrationItem.id}</li>
              <li><strong>Submitted At:</strong> ${registrationItem.createdAt}</li>
            </ul>
            <p>A direct registration invitation and Calendar link has been sent out to the student.</p>
          `
        });

        emailSent = true;
        transportDetails = "Nodemailer SMTP (Synchronous)";
        console.log(`Emails successfully dispatched to student (${registrationItem.email}) and host (444edtech@gmail.com)`);
      } catch (nodemailerError: any) {
        console.error("Nodemailer SMTP dispatch failed:", nodemailerError);
        transportDetails = `Nodemailer Failed: ${nodemailerError?.message || nodemailerError}`;
      }
    } else {
      console.log("-----------------------------------------");
      console.log("[SIMULATED EMAIL DISPATCH]");
      console.log("No SMTP_PASS credential configured in .env. Logging email payload is active.");
      console.log(`To: ${registrationItem.email}, 444edtech@gmail.com`);
      console.log(`Subject: Confirmed: Z444 Masterclass Direct Entry Invitation - June 7th 11:00 AM IST`);
      console.log("-----------------------------------------");
    }

    // Return successfully and instantly to client
    return res.status(200).json({
      success: true,
      message: "Successfully registered and confirmed!",
      data: registrationItem,
      emailSent: emailSent,
      transportMethod: transportDetails,
      cloudSync: savedToCloud,
      simulatedEmailContent: smtpPass ? "" : emailHtml
    });

  } catch (err: any) {
    console.error("Error in registration endpoint:", err);
    return res.status(500).json({ success: false, message: "Server error occurred during sign-up registration. Please try again." });
  }
});

// Admin endpoint to view registrations from Cloud DB / Local Backup fallback
async function handleGetRegistrations(req: any, res: any) {
  try {
    let list: any[] = [];
    let source = "local";

    firebaseDiagnostics.lastFetchAttemptTime = new Date().toISOString();
    firebaseDiagnostics.lastFetchSuccess = false;
    firebaseDiagnostics.lastFetchError = null;

    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("registrations").get();
        querySnapshot.forEach((docSnap) => {
          const rawData = docSnap.data();
          let createdAtStr = rawData.createdAt;
          if (rawData.createdAt && typeof rawData.createdAt.toDate === "function") {
            createdAtStr = rawData.createdAt.toDate().toISOString();
          }
          list.push({
            ...rawData,
            createdAt: createdAtStr
          });
        });
        source = "firestore";
        firebaseDiagnostics.lastFetchSuccess = true;
        firebaseDiagnostics.lastFetchCount = list.length;
        console.log(`Fetched ${list.length} records directly from secure Cloud Firestore`);
      } catch (firestoreErr: any) {
        firebaseDiagnostics.lastFetchError = firestoreErr?.message || String(firestoreErr);
        if (firestoreErr?.message?.includes("PERMISSION_DENIED")) {
          console.log("Firestore database access restricted / pending credentials. Relying on local register file backup.");
        } else {
          console.log("Firestore query notification:", firestoreErr?.message || firestoreErr);
        }
      }
    } else {
      firebaseDiagnostics.lastFetchError = "firestoreDb is null / not initialized";
    }

    // Determine if the Firestore collection was successfully queried but didn't have any records yet
    const firestoreQueryWorkedButEmpty = (firestoreDb && firebaseDiagnostics.lastFetchSuccess && list.length === 0);

    // Fallback if list is empty or firestore couldn't be requested
    if (list.length === 0) {
      list = loadLocalRegistrations();
      source = "local";
    }

    return res.status(200).json({ 
      success: true, 
      count: list.length, 
      registrations: list, 
      dataSource: firestoreQueryWorkedButEmpty ? "firestore_empty_fallback_local" : source,
      firebaseDiagnostics: firebaseDiagnostics
    });
  } catch (err: any) {
    return res.status(500).json({ 
      success: false, 
      error: err.message,
      firebaseDiagnostics: firebaseDiagnostics
    });
  }
}

// Get all Home Submissions for Admin view
async function handleGetHomeSubmissions(req: any, res: any) {
  try {
    let list: any[] = [];
    let source = "local";
    const seenIds = new Set<string>();

    if (firestoreDb) {
      try {
        // Fetch from home_submissions collection
        const querySnapshot = await firestoreDb.collection("home_submissions").get();
        querySnapshot.forEach((docSnap: any) => {
          const rawData = docSnap.data();
          const itemId = rawData.id || docSnap.id;
          if (itemId && seenIds.has(itemId)) return;
          if (itemId) seenIds.add(itemId);

          let createdAtStr = rawData.createdAt;
          if (rawData.createdAt && typeof rawData.createdAt.toDate === "function") {
            createdAtStr = rawData.createdAt.toDate().toISOString();
          }
          
          // Exclude large resume data from the list view
          const { resume, ...rest } = rawData;
          list.push({
            ...rest,
            createdAt: createdAtStr,
            hasResume: !!(rawData.resume || rawData.resumeFileBase64 || rawData.resumeUrl)
          });
        });

        // Also fetch from resumes collection
        const resumesSnapshot = await firestoreDb.collection("resumes").get();
        resumesSnapshot.forEach((docSnap: any) => {
          const rawData = docSnap.data();
          const itemId = rawData.id || docSnap.id;
          if (itemId && seenIds.has(itemId)) return;
          if (itemId) seenIds.add(itemId);

          let createdAtStr = rawData.createdAt;
          if (rawData.createdAt && typeof rawData.createdAt.toDate === "function") {
            createdAtStr = rawData.createdAt.toDate().toISOString();
          }
          
          // Exclude large resume data from the list view
          const { resumeFileBase64, ...rest } = rawData;
          list.push({
            ...rest,
            createdAt: createdAtStr,
            hasResume: !!(rawData.resumeFileName || rawData.resumeUrl || rawData.resumeFileBase64)
          });
        });

        source = "firestore";
      } catch (firestoreErr: any) {
        console.log("Firestore home_submissions/resumes read failed, fallback to local:", firestoreErr?.message || firestoreErr);
      }
    }

    if (list.length === 0) {
      const localRaw = loadLocalSubmissions();
      list = localRaw.map((item: any) => {
        const { resume, resumeFileBase64, ...rest } = item;
        return {
          ...rest,
          hasResume: !!(resume || resumeFileBase64 || item.resumeUrl)
        };
      });
    }

    // Sort descending by date
    list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json({
      success: true,
      count: list.length,
      submissions: list,
      dataSource: source
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

app.get("/api/home-submissions", handleGetHomeSubmissions);

// Update mock interview details
app.post("/api/update-mock-interview", async (req, res) => {
  try {
    const { id, meetLink, startTime, endTime } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "ID required" });

    const mockInterview = {
      meetLink: meetLink || "",
      startTime: startTime || "",
      endTime: endTime || "",
      updatedAt: new Date().toISOString()
    };

    if (firestoreDb) {
      // Try home_submissions first
      const homeRef = firestoreDb.collection("home_submissions").doc(id);
      const homeDoc = await homeRef.get();
      if (homeDoc.exists) {
        await homeRef.update({ mockInterview });
        return res.json({ success: true, message: "Updated mock interview details" });
      }

      // Try resumes second
      const resumeRef = firestoreDb.collection("resumes").doc(id);
      const resumeDoc = await resumeRef.get();
      if (resumeDoc.exists) {
        await resumeRef.update({ mockInterview });
        return res.json({ success: true, message: "Updated mock interview details" });
      }
      
      return res.status(404).json({ success: false, message: "Submission not found in database" });
    }

    return res.status(503).json({ success: false, message: "Database not available" });
  } catch (err: any) {
    console.error("Update mock interview err:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get all submissions with mock interview details for public view
app.get("/api/public-mock-interviews", async (req, res) => {
  try {
    let list: any[] = [];
    if (firestoreDb) {
      // Fetch from home_submissions
      const homeSnapshot = await firestoreDb.collection("home_submissions").get();
      homeSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.mockInterview && (data.mockInterview.meetLink || data.mockInterview.startTime)) {
          list.push({
            id: data.id || doc.id,
            name: data.name,
            email: data.email,
            mockInterview: data.mockInterview
          });
        }
      });

      // Fetch from resumes
      const resumeSnapshot = await firestoreDb.collection("resumes").get();
      resumeSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.mockInterview && (data.mockInterview.meetLink || data.mockInterview.startTime)) {
          list.push({
            id: data.id || doc.id,
            name: data.name,
            email: data.email,
            mockInterview: data.mockInterview
          });
        }
      });
    }
    
    // Sort by name for public view
    list.sort((a, b) => a.name.localeCompare(b.name));
    
    return res.json({ success: true, count: list.length, interviews: list });
  } catch (err: any) {
    console.error("Fetch public mock interviews err:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific resume data by ID
app.get("/api/submission-resume/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: "ID required" });

    if (firestoreDb) {
      // Try home_submissions first
      let doc = await firestoreDb.collection("home_submissions").doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        return res.json({ 
          success: true, 
          resume: data?.resume,
          resumeFileBase64: data?.resume?.data,
          resumeFileName: data?.resume?.name
        });
      }

      // Try resumes second
      doc = await firestoreDb.collection("resumes").doc(id).get();
      if (doc.exists) {
        const data = doc.data();
        return res.json({ 
          success: true, 
          resumeFileBase64: data?.resumeFileBase64,
          resumeFileName: data?.resumeFileName,
          resumeUrl: data?.resumeUrl
        });
      }
    }

    // Check local/in-memory if not in Firestore or Firestore disabled
    const local = loadLocalSubmissions().find(s => s.id === id);
    if (local) {
      return res.json({ 
        success: true, 
        resume: local.resume,
        resumeFileBase64: local.resumeFileBase64 || local.resume?.data,
        resumeFileName: local.resumeFileName || local.resume?.name,
        resumeUrl: local.resumeUrl
      });
    }

    return res.status(404).json({ success: false, message: "Submission not found" });
  } catch (err: any) {
    console.error("Fetch resume err:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Submit Home Form
app.post("/api/home-submissions", async (req, res) => {
  try {
    const { name, phone, email, yearOfStudy, branch, collegeName, resume } = req.body;

    // Server-side strict validations
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid name. Must be 1-100 characters." });
    }
    const phoneRegex = /^[+]?[0-9\s\-()]{8,20}$/;
    if (!phone || typeof phone !== "string" || !phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }
    const validYears = ["1", "2", "3", "4"];
    if (!yearOfStudy || !validYears.includes(String(yearOfStudy))) {
      return res.status(400).json({ success: false, message: "Year of study must be 1, 2, 3, or 4." });
    }
    if (!branch || typeof branch !== "string" || branch.trim().length === 0 || branch.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid branch name. Must be 1-100 characters." });
    }
    if (!collegeName || typeof collegeName !== "string" || collegeName.trim().length === 0 || collegeName.length > 150) {
      return res.status(400).json({ success: false, message: "Invalid college name. Must be 1-150 characters." });
    }
    if (!resume) {
      return res.status(400).json({ success: false, message: "Resume is required." });
    }

    const submissionId = "sub_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const submissionItem = {
      id: submissionId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      yearOfStudy: String(yearOfStudy),
      branch: branch.trim(),
      collegeName: collegeName.trim(),
      resume, // Storing as { data: string (Base64), name: string, type: string, size: number }
      createdAt: new Date().toISOString()
    };

    // 1. Save Locally
    saveLocalSubmission(submissionItem);

    // 2. Sync to Cloud DB
    let savedToCloud = false;
    if (firestoreDb) {
      try {
        const docRef = firestoreDb.collection("home_submissions").doc(submissionId);
        await docRef.set({
          ...submissionItem,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        savedToCloud = true;
      } catch (fErr: any) {
        console.error("Firestore home submission sync fail:", fErr?.message || fErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Submission successfully received!",
      submission: submissionItem,
      cloudSync: savedToCloud
    });

  } catch (err: any) {
    console.error("Error in home submission endpoint:", err);
    return res.status(500).json({ success: false, message: "A server error occurred when submitting form." });
  }
});

// Get all WhatsApp Community applications for Admin view
async function handleGetCommunityRegistrations(req: any, res: any) {
  try {
    let list: any[] = [];
    let source = "local";

    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("community_registrations").get();
        querySnapshot.forEach((docSnap) => {
          const rawData = docSnap.data();
          let createdAtStr = rawData.createdAt;
          if (rawData.createdAt && typeof rawData.createdAt.toDate === "function") {
            createdAtStr = rawData.createdAt.toDate().toISOString();
          }
          list.push({
            ...rawData,
            createdAt: createdAtStr
          });
        });
        source = "firestore";
      } catch (firestoreErr: any) {
        console.log("Firestore community_registrations read failed, fallback to local:", firestoreErr?.message || firestoreErr);
      }
    }

    if (list.length === 0) {
      list = loadLocalCommunity();
    }

    // Sort descending by date
    list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json({
      success: true,
      count: list.length,
      registrations: list,
      dataSource: source
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

app.get("/api/community/registrations", handleGetCommunityRegistrations);

// Student registration for WhatsApp Community
app.post("/api/community/register", async (req, res) => {
  try {
    const { name, email, phone, paymentScreenshot, amountPaid, promoApplied } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid student name. Must be 1-100 characters." });
    }
    if (!email || typeof email !== "string" || !email.includes("@") || email.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid email ID. Please input a valid email." });
    }
    if (!phone || typeof phone !== "string" || phone.length < 8 || phone.length > 20) {
      return res.status(400).json({ success: false, message: "Invalid phone number. Must be between 8 and 20 characters." });
    }
    if (!paymentScreenshot || typeof paymentScreenshot !== "string" || paymentScreenshot.length === 0) {
      return res.status(400).json({ success: false, message: "Payment confirmation screenshot is required." });
    }
    const finalAmount = Number(amountPaid);
    if (finalAmount !== 999 && finalAmount !== 244) {
      return res.status(400).json({ success: false, message: "Payment amount must be either 999 or 244." });
    }

    const regId = "com_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const commItem = {
      id: regId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      paymentScreenshot,
      amountPaid: finalAmount,
      promoApplied: (promoApplied || "").trim(),
      status: "pending",
      createdAt: new Date().toISOString()
    };

    // 1. Save Locally
    saveLocalCommunity(commItem);

    // 2. Sync to Cloud DB
    let savedToCloud = false;
    if (firestoreDb) {
      try {
        const docRef = firestoreDb.collection("community_registrations").doc(regId);
        await docRef.set({
          ...commItem,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        savedToCloud = true;
      } catch (fErr: any) {
        console.error("Firestore community registration sync fail:", fErr?.message || fErr);
      }
    }

    // Try sending initial confirmation email to admin & student if SMTP configured
    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 Team <${smtpUser}>`;

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        // Email to student "Application received"
        await transporter.sendMail({
          from: smtpFrom,
          to: commItem.email,
          subject: "Admissions Desk: Z444 WhatsApp Community Application Received",
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05);">
              <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Z444 WhatsApp Community Apply</h1>
                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Application is pending review</p>
              </div>
              <div style="padding: 24px; background-color: #ffffff;">
                <p>Dear ${commItem.name},</p>
                <p>We have successfully received your registration details and payment proof for joining Z444's exclusive premium WhatsApp Community.</p>
                <p><strong>What happens next?</strong><br>Our admissions descriptors are presently verifying your transaction proof. We will complete the review and share your official community invite link via status mail within <strong>1-2 hours</strong>.</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">
                  <strong>Review Particulars:</strong><br/>
                  • Name: ${commItem.name}<br/>
                  • Email: ${commItem.email}<br/>
                  • Amount verified: INR ${commItem.amountPaid}<br/>
                  • Code: ${commItem.promoApplied || "None"}<br/>
                  • ID: ${commItem.id}
                </div>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                <p style="font-size: 12px; color: #64748b; margin-bottom: 0; text-align: center;">
                  Warm regards,<br/><strong>Z444 EdTech Operations Desk</strong>
                </p>
              </div>
            </div>
          `
        });

        // Email to admin
        await transporter.sendMail({
          from: smtpFrom,
          to: "444edtech@gmail.com",
          subject: `New Community Application: ${commItem.name} (INR ${commItem.amountPaid})`,
          html: `
            <h3>New premium WhatsApp Community sign-up received!</h3>
            <ul>
              <li><strong>Name:</strong> ${commItem.name}</li>
              <li><strong>Email:</strong> ${commItem.email}</li>
              <li><strong>Phone:</strong> ${commItem.phone}</li>
              <li><strong>Amount Verified:</strong> INR ${commItem.amountPaid}</li>
              <li><strong>Promo Code:</strong> ${commItem.promoApplied || "None"}</li>
              <li><strong>Registration ID:</strong> ${commItem.id}</li>
            </ul>
            <p>Please log in to Z444 Masterclass Control panel (/z444space) to view their screenshot and approve/reject their registration.</p>
          `
        });
      } catch (nodemailerErr: any) {
        console.error("Nodemailer SMTP failed on community register dispatch:", nodemailerErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "WhatsApp community registration successfully received! Awaiting admin review.",
      registration: commItem,
      cloudSync: savedToCloud
    });

  } catch (err: any) {
    console.error("Error in community register endpoint:", err);
    return res.status(500).json({ success: false, message: "A server error occurred when submitting registration." });
  }
});

// Admin review endpoint (allows approve or reject)
app.post("/api/community/review", async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id || (status !== "approved" && status !== "rejected")) {
      return res.status(400).json({ success: false, message: "Invalid parameters requested." });
    }

    // Load list
    let list = loadLocalCommunity();
    let record = list.find(m => m.id === id);

    if (firestoreDb) {
      try {
        const docSnap = await firestoreDb.collection("community_registrations").doc(id).get();
        if (docSnap.exists) {
          record = docSnap.data();
        }
      } catch (firestoreErr) {
        console.log("Error finding record in Firestore:", firestoreErr);
      }
    }

    if (!record) {
      return res.status(404).json({ success: false, message: "Community application record not found." });
    }

    record.status = status;
    saveLocalCommunity(record);

    let savedToCloud = false;
    if (firestoreDb) {
      try {
        await firestoreDb.collection("community_registrations").doc(id).update({
          status: status
        });
        savedToCloud = true;
      } catch (firestoreErr: any) {
        console.log("Firestore review sync error:", firestoreErr?.message || firestoreErr);
      }
    }

    // Send emails based on review result
    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 Team <${smtpUser}>`;

    let emailSent = false;
    let transportMsg = "Simulated";

    let subject = "";
    let emailHtml = "";

    if (status === "approved") {
      subject = "Application Approved: Welcome to Z444 Premium WhatsApp Community!";
      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">APPLICATION APPROVED</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #f8fafc; tracking-tight: -0.025em;">Welcome to Z444 Premium Community</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13.5px;">Accolades await inside peer workspace</p>
          </div>
          
          <div style="padding: 28px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: 700; margin-top: 0; color: #0f172a;">Dear ${record.name},</p>
            <p style="margin-top: 4px; font-size: 14.5px; color: #334155;">Fantastic news! Your fee confirmation has been verified and your community application is approved. We are thrilled to welcome you to the premium Z444 WhatsApp Community!</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 18px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; font-weight: 800; color: #065f46; font-size: 13.5px; text-transform: uppercase;">💬 COMMUNITY ADDITION:</p>
              <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #1e293b;">
                You will be added <strong>directly</strong> to our private WhatsApp Community by our administrative team. There is no public link to click. Please make sure that your phone number (${record.phone}) is active on WhatsApp.
              </p>
            </div>

            <p style="font-size: 14.5px; color: #334155;">If you have any questions or have not been added within 1 to 2 hours, please reach out to us at <strong>444edtech@gmail.com</strong> so our support operations group can assist you immediately.</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;">
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0; text-align: center; line-height: 1.6;">
              Warm regards,<br>
              <strong style="color: #0f172a;">Z444 EdTech Operations Team</strong><br>
              Direct contact: <a href="mailto:444edtech@gmail.com" style="color: #4f46e5; text-decoration: underline;">444edtech@gmail.com</a>
            </p>
          </div>
        </div>
      `;
    } else {
      subject = "Application status update: Z444 Premium WhatsApp Community Form";
      emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">APPLICATION UPDATE</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #f8fafc; tracking-tight: -0.025em;">Community Application processed</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13.5px;">Pending confirmation feedback</p>
          </div>
          
          <div style="padding: 28px; background-color: #ffffff;">
            <p style="font-size: 16px; font-weight: 700; margin-top: 0; color: #0f172a;">Dear ${record.name},</p>
            <p style="margin-top: 4px; font-size: 14.5px; color: #334155;">Thank you for your interest in joining the premium Z444 WhatsApp community. Your application has been reviewed but unfortunately, your registration could not be approved at this time under the provided transaction screenshot.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 18px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0; font-size: 13.5px; line-height: 1.7; color: #991b1b; font-weight: 600;">
                If you believe this is in error or would like to submit a corrected payment confirmation:
              </p>
              <p style="margin: 6px 0 0 0; font-size: 13.5px; color: #334155;">
                Please write back to us directly at <strong>444edtech@gmail.com</strong> along with your valid fee submission reference. We will inspect and fix your enrollment status right away.
              </p>
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;">
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0; text-align: center; line-height: 1.6;">
              Warm regards,<br>
              <strong style="color: #0f172a;">Z444 EdTech Operations Team</strong><br>
              Direct contact: <a href="mailto:444edtech@gmail.com" style="color: #4f46e5; text-decoration: underline;">444edtech@gmail.com</a>
            </p>
          </div>
        </div>
      `;
    }

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        await transporter.sendMail({
          from: smtpFrom,
          to: record.email,
          subject: subject,
          html: emailHtml
        });
        emailSent = true;
        transportMsg = "SMTP NodeMailer";
      } catch (smtpErr: any) {
        console.error("Nodemailer SMTP failed in review dispatcher:", smtpErr);
        transportMsg = `Nodemailer failed: ${smtpErr?.message || smtpErr}`;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status} for ${record.name}. Notification email dispatched.`,
      record,
      emailSent,
      transportMethod: transportMsg,
      cloudSync: savedToCloud
    });

  } catch (err: any) {
    console.error("Error in community review endpoint:", err);
    return res.status(500).json({ success: false, message: "An error occurred during application review processing." });
  }
});

// Map routes so they are fully aligned with the live DB structure
app.get("/api/registrations", handleGetRegistrations);
app.get("/api/local-registrations", handleGetRegistrations);

// Submissions / Resumes API endpoints
async function handleGetSubmissions(req: any, res: any) {
  try {
    let list: any[] = [];
    let source = "local";

    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("resumes").get();
        querySnapshot.forEach((docSnap) => {
          const rawData = docSnap.data();
          let createdAtStr = rawData.createdAt;
          if (rawData.createdAt && typeof rawData.createdAt.toDate === "function") {
            createdAtStr = rawData.createdAt.toDate().toISOString();
          }
          list.push({
            ...rawData,
            createdAt: createdAtStr
          });
        });
        source = "firestore";
      } catch (firestoreErr: any) {
        console.log("Firestore resumes read failed, fallback to local:", firestoreErr?.message || firestoreErr);
      }
    }

    if (list.length === 0) {
      list = loadLocalSubmissions();
      source = "local";
    }

    // Sort descending by date
    list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json({
      success: true,
      count: list.length,
      submissions: list,
      dataSource: source
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

app.get("/api/submissions", handleGetSubmissions);
app.get("/api/resumes", handleGetSubmissions);

async function handlePostSubmissions(req: any, res: any) {
  try {
    const { name, phone, email, yearOfStudy, branch, collegeName, resumeFileName, resumeFileBase64, resumeUrl } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid student name. Must be 1-100 characters." });
    }
    const phoneRegex = /^[+]?[0-9\s\-()]{8,15}$/;
    if (!phone || typeof phone !== "string" || !phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number. Must be between 8 and 15 digits." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }
    const validYears = ["1", "2", "3", "4"];
    if (!yearOfStudy || !validYears.includes(yearOfStudy)) {
      return res.status(400).json({ success: false, message: "Year of study must be 1, 2, 3, or 4." });
    }
    if (!branch || typeof branch !== "string" || branch.trim().length === 0 || branch.length > 100) {
      return res.status(400).json({ success: false, message: "Invalid branch name. Must be 1-100 characters." });
    }
    if (!collegeName || typeof collegeName !== "string" || collegeName.trim().length === 0 || collegeName.length > 200) {
      return res.status(400).json({ success: false, message: "Invalid college name. Must be 1-200 characters." });
    }

    const regId = "res_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const resumeItem = {
      id: regId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      yearOfStudy,
      branch: branch.trim(),
      collegeName: collegeName.trim(),
      resumeFileName: resumeFileName ? resumeFileName.trim() : null,
      resumeFileBase64: resumeFileBase64 || null,
      resumeUrl: resumeUrl ? resumeUrl.trim() : null,
      createdAt: new Date().toISOString()
    };

    // 1. Save Locally
    saveLocalSubmission(resumeItem);

    // 2. Sync to Cloud DB
    let savedToCloud = false;
    if (firestoreDb) {
      try {
        const docRef = firestoreDb.collection("resumes").doc(regId);
        await docRef.set({
          ...resumeItem,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        savedToCloud = true;
        console.log(`Saved resume submission ${regId} securely to Cloud Firestore`);
      } catch (fErr: any) {
        console.error("Firestore resume sync fail:", fErr?.message || fErr);
      }
    }

    // Try sending notification to admin if SMTP configured
    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 Team <${smtpUser}>`;

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        // Email to admin
        await transporter.sendMail({
          from: smtpFrom,
          to: "444edtech@gmail.com",
          subject: `New Student Resume Submitted: ${resumeItem.name} (${resumeItem.branch})`,
          html: `
            <h3>New Resume Form submission received!</h3>
            <ul>
              <li><strong>Name:</strong> ${resumeItem.name}</li>
              <li><strong>Phone:</strong> ${resumeItem.phone}</li>
              <li><strong>Email:</strong> ${resumeItem.email}</li>
              <li><strong>Year of Study:</strong> Year ${resumeItem.yearOfStudy}</li>
              <li><strong>Branch/Department:</strong> ${resumeItem.branch}</li>
              <li><strong>College Name:</strong> ${resumeItem.collegeName}</li>
              <li><strong>File Name:</strong> ${resumeItem.resumeFileName || "N/A"}</li>
              <li><strong>Resume URL/Link:</strong> ${resumeItem.resumeUrl || "N/A"}</li>
              <li><strong>Submission ID:</strong> ${resumeItem.id}</li>
              <li><strong>Submitted At:</strong> ${resumeItem.createdAt}</li>
            </ul>
          `
        });
      } catch (mailErr: any) {
        console.error("Failed to send resume email notification:", mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Resume submission successfully processed!",
      data: resumeItem,
      cloudSync: savedToCloud
    });
  } catch (err: any) {
    console.error("Error in resumes submission:", err);
    return res.status(500).json({ success: false, message: "Internal server error occurred when submitting resume." });
  }
}

app.post("/api/submissions", handlePostSubmissions);

// Admin manual trigger: Send a Few Hours Remaining email reminder to all registered students
app.post("/api/send-urgency-reminder", async (req, res) => {
  try {
    let list: any[] = [];
    
    // 1. Fetch from Firestore if possible, fallback to local backup files
    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("registrations").get();
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        console.log(`[Urgency Reminder] Fetched ${list.length} direct registrations from Cloud Firestore`);
      } catch (firestoreErr: any) {
        console.warn("[Urgency Reminder] Firestore query notification:", firestoreErr?.message || firestoreErr);
      }
    }
    
    if (list.length === 0) {
      list = loadLocalRegistrations();
      console.log(`[Urgency Reminder] Loaded ${list.length} direct registrations from local back up storage file`);
    }

    if (list.length === 0) {
      return res.status(400).json({ success: false, message: "No registered students found in DB to broadcast reminders." });
    }

    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 Masterclass Team <${smtpUser}>`;

    let transporter: nodemailer.Transporter | null = null;
    if (smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    }

    const subject = "⏳ [Few Hours Remaining] Z444 Masterclass Live Starts Today at 11:00 AM IST!";

    // Return response immediately to prevent Gateway Timeout (504)
    res.status(200).json({
      success: true,
      message: transporter 
        ? `Successfully initiated the background batch email broadcast of "Few Hours Remaining" reminders to all ${list.length} registered candidates! This runs safely in the background to prevent timeouts.` 
        : `Simulated background manual dispatch of "Few Hours Remaining" email reminder to all ${list.length} students (No SMTP password set on Server).`,
      count: list.length
    });

    if (!transporter) {
      console.log(`[Background Urgency Broadcast] Simulated background dispatch for ${list.length} students.`);
      activeBroadcasts.urgency = {
        id: "urgency",
        total: list.length,
        processed: list.length,
        sentCount: list.length,
        failedCount: 0,
        status: "completed",
        errors: [],
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      };
      return;
    }

    // Run actual SMTP transmission loop in non-blocking background context
    (async () => {
      console.log(`[Background Urgency Broadcast] Starting background transmission for ${list.length} students...`);
      
      activeBroadcasts.urgency = {
        id: "urgency",
        total: list.length,
        processed: 0,
        sentCount: 0,
        failedCount: 0,
        status: "running",
        errors: [],
        startTime: new Date().toISOString()
      };

      let sentCount = 0;
      let failedCount = 0;
      let processed = 0;

      for (const student of list) {
        const studentEmail = student.email || "";
        const studentName = student.name || "Student";
        
        if (!studentEmail || !studentEmail.includes("@")) {
          processed++;
          activeBroadcasts.urgency.processed = processed;
          continue;
        }

        const emailHtml = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Live in a Few Hours! 🚀</h1>
            <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Bridging the Gap: College Studies to Industry Job Expectations</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p>Hello <strong>${studentName}</strong>,</p>
            <p>This is a quick direct call! The highly anticipated <strong>Z444 Masterclass</strong> is starting in just a few hours. Make sure you don't miss this live training masterclass.</p>
            
            <div style="background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 18px; margin: 24px 0; border-radius: 8px;">
              <p style="margin: 0; font-weight: 800; color: #4338ca; font-size: 13.5px; text-transform: uppercase;">🔥 ACCESS INFORMATION:</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
                ⏰ <strong>Time:</strong> Today, Sunday at 11:00 AM Indian Standard Time (IST) Sharp<br>
                📍 <strong>Venue:</strong> Google Meet Live Classroom<br>
                🔗 <strong>Direct Joining link:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #6366f1; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
              </p>
            </div>

            <p><strong>What to prepare and keep handy:</strong></p>
            <ul style="padding-left: 20px; margin: 12px 0; font-size: 13.5px; color: #334155;">
              <li style="margin-bottom: 6px;">A notepad, notebook, or pen to take rapid tactical notes.</li>
              <li style="margin-bottom: 6px;">Be in an environment with high-speed internet capability.</li>
            </ul>

            <p style="font-size: 13.5px; color: #334155;"><strong>Note:</strong> Log in at least 5 minutes early to secure your spot and avoid capacity constraints on Google Meet.</p>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              Warm regards,<br>
              <strong>Z444 Masterclass Team</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">Direct Support: 444edtech@gmail.com</span>
            </p>
          </div>
        </div>
        `;

        try {
          const icalContent = generateIcalEvent(studentName, studentEmail, student.id || "manual-reminder");
          await transporter!.sendMail({
            from: smtpFrom,
            to: studentEmail,
            subject: subject,
            html: emailHtml,
            icalEvent: {
              filename: "invite.ics",
              method: "REQUEST",
              content: icalContent
            },
            alternatives: [
              {
                contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
                content: icalContent
              }
            ]
          });
          sentCount++;
          activeBroadcasts.urgency.sentCount = sentCount;
        } catch (mailErr: any) {
          console.error(`[Manual Reminder] Background dispatch failed for ${studentEmail}:`, mailErr);
          failedCount++;
          activeBroadcasts.urgency.failedCount = failedCount;
          activeBroadcasts.urgency.errors.push({
            email: studentEmail,
            name: studentName,
            error: mailErr?.message || String(mailErr),
            timestamp: new Date().toISOString()
          });
        }
        
        processed++;
        activeBroadcasts.urgency.processed = processed;

        // Increased throttle delay (1500ms) to bypass email client rate limits and SMTP locks
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      
      activeBroadcasts.urgency.status = "completed";
      activeBroadcasts.urgency.endTime = new Date().toISOString();
      console.log(`[Background Urgency Broadcast] Finished dispatching. Sent: ${sentCount}, Failed: ${failedCount}`);
    })().catch((err) => {
      activeBroadcasts.urgency.status = "failed";
      activeBroadcasts.urgency.endTime = new Date().toISOString();
      console.error("[Background Urgency Broadcast] Exception occurred in background sending loop:", err);
    });

  } catch (err: any) {
    console.error("[Urgency Reminder Endpoint Error]:", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  }
});

// Admin manual trigger: Send Feedback and Community Registration forms email to all registered students
app.post("/api/send-feedback-community-email", async (req, res) => {
  try {
    let list: any[] = [];
    
    // 1. Fetch from Firestore if possible, fallback to local backup files
    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("registrations").get();
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        console.log(`[Feedback/Community Email] Fetched ${list.length} direct registrations from Cloud Firestore`);
      } catch (firestoreErr: any) {
        console.warn("[Feedback/Community Email] Firestore query notification:", firestoreErr?.message || firestoreErr);
      }
    }
    
    if (list.length === 0) {
      list = loadLocalRegistrations();
      console.log(`[Feedback/Community Email] Loaded ${list.length} direct registrations from local back up storage file`);
    }

    if (list.length === 0) {
      return res.status(400).json({ success: false, message: "No registered students found in DB to broadcast form emails." });
    }

    const feedbackUrl = "https://www.z444.co.in/feedbackform";
    const communityUrl = "https://www.z444.co.in/community";

    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 EdTech Team <${smtpUser}>`;

    let transporter: nodemailer.Transporter | null = null;
    if (smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    }

    const subject = "📝 Z444 Masterclass Feedback & Premium WhatsApp Community Admission Link";

    // Return response immediately to prevent Gateway Timeout (504)
    res.status(200).json({
      success: true,
      message: transporter 
        ? `Successfully initiated the background batch email broadcast of "Feedback & Community Form links" to all ${list.length} registered candidates! This runs safely in the background to prevent timeouts.` 
        : `Simulated background manual dispatch of "Feedback & Community Form links" email to all ${list.length} students (No SMTP password set on Server).`,
      count: list.length
    });

    if (!transporter) {
      console.log(`[Background Feedback Broadcast] Simulated background dispatch for ${list.length} students.`);
      activeBroadcasts.forms = {
        id: "forms",
        total: list.length,
        processed: list.length,
        sentCount: list.length,
        failedCount: 0,
        status: "completed",
        errors: [],
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      };
      return;
    }

    // Run actual SMTP transmission loop in non-blocking background context
    (async () => {
      console.log(`[Background Feedback Broadcast] Starting background transmission for ${list.length} students...`);
      
      activeBroadcasts.forms = {
        id: "forms",
        total: list.length,
        processed: 0,
        sentCount: 0,
        failedCount: 0,
        status: "running",
        errors: [],
        startTime: new Date().toISOString()
      };

      let sentCount = 0;
      let failedCount = 0;
      let processed = 0;

      for (const student of list) {
        const studentEmail = student.email || "";
        const studentName = student.name || "Student";
        
        if (!studentEmail || !studentEmail.includes("@")) {
          processed++;
          activeBroadcasts.forms.processed = processed;
          continue;
        }

        const emailHtml = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Workshop Survey & Community 🚀</h1>
            <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Your Opinion Matters & Stay Connected! Bridging academia to true industry expectations.</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p>Hello <strong>${studentName}</strong>,</p>
            <p>Thank you for participating in the <strong>Z444 Masterclass</strong>! To help us improve and continue delivering high-impact workshops, please take 1 minute to fill out our quick reflection and feedback form. In addition, you can now apply to join our exclusive, premium WhatsApp Community!</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 24px 0; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-weight: 800; color: #4f46e5; font-size: 14px; text-transform: uppercase;">📝 SHARE YOUR FEEDBACK</p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569;">Submit your honest feedback, satisfaction rating, and comments about your experience.</p>
              <a href="${feedbackUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">Fill Out Feedback Form</a>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 24px 0; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-weight: 800; color: #16a34a; font-size: 14px; text-transform: uppercase;">💬 JOIN THE PREMIUM COMMUNITY</p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #166534;">Get direct access to expert guidance, resumes templates, premium job referrals, and live peer chats for INR 244!</p>
              <a href="${communityUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">Apply to Premium Community</a>
            </div>

            <p style="font-size: 13.5px; color: #334155;">Should you have any queries or need specialized assistance during the registration, feel free to reply directly to this email.</p>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
              Warm regards,<br>
              <strong>Z444 EdTech Operations Team</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">Direct Support: 444edtech@gmail.com</span>
            </p>
          </div>
        </div>
        `;

        try {
          await transporter!.sendMail({
            from: smtpFrom,
            to: studentEmail,
            subject: subject,
            html: emailHtml
          });
          sentCount++;
          activeBroadcasts.forms.sentCount = sentCount;
        } catch (mailErr: any) {
          console.error(`[Feedback/Community Email] Background dispatch failed for ${studentEmail}:`, mailErr);
          failedCount++;
          activeBroadcasts.forms.failedCount = failedCount;
          activeBroadcasts.forms.errors.push({
            email: studentEmail,
            name: studentName,
            error: mailErr?.message || String(mailErr),
            timestamp: new Date().toISOString()
          });
        }
        
        processed++;
        activeBroadcasts.forms.processed = processed;

        // Increased throttle delay (1500ms) to bypass email client rate limits and SMTP locks
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      
      activeBroadcasts.forms.status = "completed";
      activeBroadcasts.forms.endTime = new Date().toISOString();
      console.log(`[Background Feedback Broadcast] Finished dispatching. Sent: ${sentCount}, Failed: ${failedCount}`);
    })().catch((err) => {
      activeBroadcasts.forms.status = "failed";
      activeBroadcasts.forms.endTime = new Date().toISOString();
      console.error("[Background Feedback Broadcast] Exception occurred in background sending loop:", err);
    });

  } catch (err: any) {
    console.error("[Feedback/Community Email Endpoint Error]:", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  }
});

// Admin endpoint to send single student customized email
app.post("/api/send-single-student-email", async (req, res) => {
  try {
    const { studentId, template } = req.body;
    if (!studentId || !template || (template !== "urgency" && template !== "forms")) {
      return res.status(400).json({ success: false, error: "Missing or invalid parameters." });
    }

    let list: any[] = [];
    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("registrations").get();
        querySnapshot.forEach((docSnap) => {
          const rawData = docSnap.data();
          list.push({ id: docSnap.id, ...rawData });
        });
      } catch (firestoreErr: any) {
        console.warn("[Single Student Email] Firestore notification:", firestoreErr?.message || firestoreErr);
      }
    }

    const localList = loadLocalRegistrations();
    const combinedList = [...list];
    for (const item of localList) {
      if (!combinedList.some(c => String(c.id) === String(item.id))) {
        combinedList.push(item);
      }
    }

    const student = combinedList.find(s => String(s.id) === String(studentId));
    if (!student) {
      return res.status(404).json({ success: false, error: `Student registration not found in dashboard database (Checked ${combinedList.length} total entries).` });
    }

    const studentEmail = student.email || "";
    const studentName = student.name || "Student";
    if (!studentEmail || !studentEmail.includes("@")) {
      return res.status(400).json({ success: false, error: `Invalid email address detected for ${studentName}.` });
    }

    const feedbackUrl = "https://www.z444.co.in/feedbackform";
    const communityUrl = "https://www.z444.co.in/community";

    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || (template === "urgency" ? `Z444 Masterclass Team <${smtpUser}>` : `Z444 EdTech Operations Team <${smtpUser}>`);

    if (!smtpPass) {
      return res.status(200).json({
        success: true,
        simulated: true,
        message: `[Simulating Direct Dispatch] Successfully simulated direct email delivery of "${template === 'urgency' ? 'Few Hours Remaining' : 'Feedback & Community Links'}" to ${studentName} (${studentEmail}). Setup SMTP password on server to deliver live emails.`
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    let subject = "";
    let emailHtml = "";

    if (template === "urgency") {
      subject = "⏳ Z444 Masterclass Live Starts Today at 11:00 AM IST!";
      emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Live in a Few Hours! 🚀</h1>
          <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Bridging the Gap: College Studies to Industry Job Expectations</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello <strong>${studentName}</strong>,</p>
          <p>This is a quick direct call! The highly anticipated <strong>Z444 Masterclass</strong> is starting in just a few hours. Make sure you don't miss this live training masterclass.</p>
          
          <div style="background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 18px; margin: 24px 0; border-radius: 8px;">
            <p style="margin: 0; font-weight: 800; color: #4338ca; font-size: 13.5px; text-transform: uppercase;">🔥 ACCESS INFORMATION:</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ⏰ <strong>Time:</strong> Today, Sunday at 11:00 AM Indian Standard Time (IST) Sharp<br>
              📍 <strong>Venue:</strong> Google Meet Live Classroom<br>
              🔗 <strong>Direct Joining link:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #6366f1; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
            </p>
          </div>

          <p><strong>What to prepare and keep handy:</strong></p>
          <ul style="padding-left: 20px; margin: 12px 0; font-size: 13.5px; color: #334155;">
            <li style="margin-bottom: 6px;">A notepad, notebook, or pen to take rapid tactical notes.</li>
            <li style="margin-bottom: 6px;">Be in an environment with high-speed internet capability.</li>
          </ul>

          <p style="font-size: 13.5px; color: #334155;"><strong>Note:</strong> Log in at least 5 minutes early to secure your spot and avoid capacity constraints on Google Meet.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 Masterclass Team</strong><br>
            <span style="font-size: 11px; color: #94a3b8;">Direct Support: 444edtech@gmail.com</span>
          </p>
        </div>
      </div>
      `;

      const icalContent = generateIcalEvent(studentName, studentEmail, student.id || "one-on-one-reminder");
      await transporter.sendMail({
        from: smtpFrom,
        to: studentEmail,
        subject: subject,
        html: emailHtml,
        icalEvent: {
          filename: "invite.ics",
          method: "REQUEST",
          content: icalContent
        },
        alternatives: [
          {
            contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
            content: icalContent
          }
        ]
      });

    } else {
      subject = "📝 Z444 Masterclass Feedback & Premium WhatsApp Community Admission Link";
      emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Workshop Survey & Community 🚀</h1>
          <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Your Opinion Matters & Stay Connected! Bridging academia to true industry expectations.</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello <strong>${studentName}</strong>,</p>
          <p>Thank you for participating in the <strong>Z444 Masterclass</strong>! To help us improve and continue delivering high-impact workshops, please take 1 minute to fill out our quick reflection and feedback form. In addition, you can now apply to join our exclusive, premium WhatsApp Community!</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 24px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-weight: 800; color: #4f46e5; font-size: 14px; text-transform: uppercase;">📝 SHARE YOUR FEEDBACK</p>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569;">Submit your honest feedback, satisfaction rating, and comments about your experience.</p>
            <a href="${feedbackUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">Fill Out Feedback Form</a>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 24px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-weight: 800; color: #16a34a; font-size: 14px; text-transform: uppercase;">💬 JOIN THE PREMIUM COMMUNITY</p>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #166534;">Get direct access to expert guidance, resumes templates, premium job referrals, and live peer chats for INR 244!</p>
            <a href="${communityUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">Apply to Premium Community</a>
          </div>

          <p style="font-size: 13.5px; color: #334155;">Should you have any queries or need specialized assistance during the registration, feel free to reply directly to this email.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 EdTech Operations Team</strong><br>
            <span style="font-size: 11px; color: #94a3b8;">Direct Support: 444edtech@gmail.com</span>
          </p>
        </div>
      </div>
      `;

      await transporter.sendMail({
        from: smtpFrom,
        to: studentEmail,
        subject: subject,
        html: emailHtml
      });
    }

    res.json({ success: true, message: `Successfully sent "${template === 'urgency' ? 'Few Hours Remaining' : 'Feedback & Community Links'}" email to ${studentName} (${studentEmail})!` });

  } catch (err: any) {
    console.error("[Single Student Email Dispatch Error]:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to dispatch email to this student." });
  }
});

// Admin endpoint to send test template email
app.post("/api/send-test-email", async (req, res) => {
  try {
    const { template, recipient = "444edtech@gmail.com", origin } = req.body;
    
    if (!template || (template !== "urgency" && template !== "forms")) {
      return res.status(400).json({ success: false, error: "Invalid template selected." });
    }

    const feedbackUrl = "https://www.z444.co.in/feedbackform";
    const communityUrl = "https://www.z444.co.in/community";

    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || (template === "urgency" ? `Z444 Masterclass Team <${smtpUser}>` : `Z444 EdTech Operations Team <${smtpUser}>`);

    let transporter: nodemailer.Transporter | null = null;
    if (smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    }

    let subject = "";
    let emailHtml = "";
    const studentName = "Owner (Test Recipient)";
    const studentEmail = recipient;

    if (template === "urgency") {
      subject = "⏳ Z444 Masterclass Live Starts Today at 11:00 AM IST!";
      emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Live in a Few Hours! 🚀</h1>
          <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Bridging the Gap: College Studies to Industry Job Expectations</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello <strong>${studentName}</strong>,</p>
          <p>This is a quick direct call! The highly anticipated <strong>Z444 Masterclass</strong> is starting in just a few hours. Make sure you don't miss this live training masterclass.</p>
          
          <div style="background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 18px; margin: 24px 0; border-radius: 8px;">
            <p style="margin: 0; font-weight: 800; color: #4338ca; font-size: 13.5px; text-transform: uppercase;">🔥 ACCESS INFORMATION:</p>
            <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ⏰ <strong>Time:</strong> Today, Sunday at 11:00 AM Indian Standard Time (IST) Sharp<br>
              📍 <strong>Venue:</strong> Google Meet Live Classroom<br>
              🔗 <strong>Direct Joining link:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #6366f1; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
            </p>
          </div>

          <p><strong>What to prepare and keep handy:</strong></p>
          <ul style="padding-left: 20px; margin: 12px 0; font-size: 13.5px; color: #334155;">
            <li style="margin-bottom: 6px;">A notepad, notebook, or pen to take rapid tactical notes.</li>
            <li style="margin-bottom: 6px;">Be in an environment with high-speed internet capability.</li>
          </ul>

          <p style="font-size: 13.5px; color: #334155;"><strong>Note:</strong> Log in at least 5 minutes early to secure your spot and avoid capacity constraints on Google Meet.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 Masterclass Team</strong><br>
            <span style="font-size: 11px; color: #94a3b8;">Direct Support: 444edtech@gmail.com</span>
          </p>
        </div>
      </div>
      `;
    } else {
      subject = "📝 Save Your Links: Z444 Workshop Feedback & Premium WhatsApp Community Admission";
      emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Workshop Survey & Community 🚀</h1>
          <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Your Opinion Matters & Stay Connected! Bridging academia to true industry expectations.</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello <strong>${studentName}</strong>,</p>
          <p>Thank you for participating in the <strong>Z444 Masterclass</strong>! To help us improve and continue delivering high-impact workshops, please take 1 minute to fill out our quick reflection and feedback form. In addition, you can now apply to join our exclusive, premium WhatsApp Community!</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 24px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-weight: 800; color: #4f46e5; font-size: 14px; text-transform: uppercase;">📝 SHARE YOUR FEEDBACK</p>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569;">Submit your honest feedback, satisfaction rating, and comments about your experience.</p>
            <a href="${feedbackUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">Fill Out Feedback Form</a>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 24px 0; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-weight: 800; color: #16a34a; font-size: 14px; text-transform: uppercase;">💬 JOIN THE PREMIUM COMMUNITY</p>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #166534;">Get direct access to expert guidance, resumes templates, premium job referrals, and live peer chats for INR 244!</p>
            <a href="${communityUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">Apply to Premium Community</a>
          </div>

          <p style="font-size: 13.5px; color: #334155;">Should you have any queries or need specialized assistance during the registration, feel free to reply directly to this email.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 EdTech Operations Team</strong><br>
            <span style="font-size: 11px; color: #94a3b8;">Direct Support: 444edtech@gmail.com</span>
          </p>
        </div>
      </div>
      `;
    }

    if (transporter) {
      if (template === "urgency") {
        const icalContent = generateIcalEvent(studentName, studentEmail, "test-reminder-" + Date.now());
        await transporter.sendMail({
          from: smtpFrom,
          to: studentEmail,
          subject: subject,
          html: emailHtml,
          icalEvent: {
            filename: "invite.ics",
            method: "REQUEST",
            content: icalContent
          },
          alternatives: [
            {
              contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
              content: icalContent
            }
          ]
        });
      } else {
        await transporter.sendMail({
          from: smtpFrom,
          to: studentEmail,
          subject: subject,
          html: emailHtml
        });
      }
      return res.status(200).json({
        success: true,
        message: `Successfully sent test email (${template === 'urgency' ? 'Urgency Reminder' : 'Feedback & Community Forms'}) to ${studentEmail}!`
      });
    } else {
      return res.status(200).json({
        success: true,
        simulated: true,
        message: `SMTP password not configured on server. Simulated dispatch to ${studentEmail} successfully!`
      });
    }
  } catch (err: any) {
    console.error("[Test Email Endpoint Error]:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to trigger test email." });
  }
});

// Admin endpoint to view feedbacks
async function handleGetFeedbacks(req: any, res: any) {
  try {
    let list: any[] = [];
    let source = "local";

    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("feedbacks").get();
        querySnapshot.forEach((docSnap) => {
          const rawData = docSnap.data();
          let createdAtStr = rawData.createdAt;
          if (rawData.createdAt && typeof rawData.createdAt.toDate === "function") {
            createdAtStr = rawData.createdAt.toDate().toISOString();
          }
          list.push({
            ...rawData,
            createdAt: createdAtStr
          });
        });
        source = "firestore";
        console.log(`Fetched ${list.length} feedbacks directly from secure Cloud Firestore`);
      } catch (firestoreErr: any) {
        console.warn("Firestore query notification for feedbacks:", firestoreErr?.message || firestoreErr);
      }
    }

    if (list.length === 0) {
      list = loadLocalFeedbacks();
      source = "local";
    }

    return res.status(200).json({ 
      success: true, 
      count: list.length, 
      feedbacks: list, 
      dataSource: source 
    });
  } catch (err: any) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
}
app.get("/api/feedbacks", handleGetFeedbacks);

// --- REMINDER SCHEDULER BACKEND DAEMON ---

// Persistence checking for background reminder synchronization
const REMINDER_STATUS_FILE = path.join(DATA_DIR, "reminder-status.json");

function getReminderStatus(): { june6_8pm_sent: boolean; june7_10am_sent: boolean } {
  if (fs.existsSync(REMINDER_STATUS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(REMINDER_STATUS_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to parse reminder-status.json, resetting:", e);
    }
  }
  return { june6_8pm_sent: false, june7_10am_sent: false };
}

function saveReminderStatus(status: { june6_8pm_sent: boolean; june7_10am_sent: boolean }) {
  try {
    fs.writeFileSync(REMINDER_STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write reminder-status.json locally:", err);
  }
}

async function syncReminderStatus(): Promise<{ june6_8pm_sent: boolean; june7_10am_sent: boolean }> {
  const status = getReminderStatus();
  if (firestoreDb) {
    try {
      const docRef = firestoreDb.collection("reminders").doc("status");
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const firestoreStatus = docSnap.data() as any;
        status.june6_8pm_sent = status.june6_8pm_sent || !!firestoreStatus.june6_8pm_sent;
        status.june7_10am_sent = status.june7_10am_sent || !!firestoreStatus.june7_10am_sent;
        saveReminderStatus(status);
      } else {
        await docRef.set(status);
      }
    } catch (err: any) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        console.log("[DAEMON] Firestore sync inactive / pending credentials - using local JSON database state");
      } else {
        console.log("[DAEMON] Firestore global reminder status sync notification:", err?.message || err);
      }
    }
  }
  return status;
}

async function markReminderSent(reminderKey: "june6_8pm_sent" | "june7_10am_sent") {
  const status = getReminderStatus();
  status[reminderKey] = true;
  saveReminderStatus(status);
  if (firestoreDb) {
    try {
      await firestoreDb.collection("reminders").doc("status").set({
        [reminderKey]: true
      }, { merge: true });
      console.log(`[DAEMON] Successfully marked and archived "${reminderKey}" in Cloud Firestore`);
    } catch (err: any) {
      if (err?.message?.includes("PERMISSION_DENIED")) {
        console.log(`[DAEMON] Firestore sync restricted - offline cached "${reminderKey}" successfully`);
      } else {
        console.log("[DAEMON] Failed to mark reminder in global Firestore db:", err?.message || err);
      }
    }
  }
}

async function broadcastReminder(reminderKey: "june6_8pm_sent" | "june7_10am_sent", subject: string, fallbackTemplate: string, aiPrompt: string) {
  try {
    console.log(`\n=========================================\n[REMINDER DAEMON] Executing broadcast for identifier: ${reminderKey}`);
    
    // 1. Fetch entire registration list from cloud or fallback local JSON list
    let list: any[] = [];
    if (firestoreDb) {
      try {
        const querySnapshot = await firestoreDb.collection("registrations").get();
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        console.log(`[REMINDER DAEMON] Fetched ${list.length} direct registrations from Cloud Firestore`);
      } catch (firestoreErr: any) {
        if (firestoreErr?.message?.includes("PERMISSION_DENIED")) {
          console.log("[REMINDER DAEMON] Firestore registrations read restricted. Checking local backup JSON.");
        } else {
          console.log("[REMINDER DAEMON] Failed querying Firestore:", firestoreErr?.message || firestoreErr);
        }
      }
    }
    
    if (list.length === 0) {
      list = loadLocalRegistrations();
      console.log(`[REMINDER DAEMON] Loaded ${list.length} direct registrations from local back up storage file`);
    }

    if (list.length === 0) {
      console.log("[REMINDER DAEMON] Aborting broadcast - No registered students found in DB.");
      await markReminderSent(reminderKey);
      return;
    }

    const smtpUser = process.env.SMTP_USER || "444edtech@gmail.com";
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFrom = process.env.SMTP_FROM || `Z444 Masterclass Team <${smtpUser}>`;

    let transporter: nodemailer.Transporter | null = null;
    if (smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
    }

    // 2. Map and loop sending email to every single registrant
    for (const student of list) {
      const studentEmail = student.email || "";
      const studentName = student.name || "Student";
      
      if (!studentEmail || !studentEmail.includes("@")) continue;

      let emailHtml = fallbackTemplate
        .replace(/\${studentName}/g, studentName)
        .replace(/\${studentEmail}/g, studentEmail)
        .replace(/\${studentDepartment}/g, student.department || "Engineering")
        .replace(/\${studentYear}/g, student.btechYear || "");

      if (transporter) {
        try {
          const icalContent = generateIcalEvent(studentName, studentEmail, student.id);
          await transporter.sendMail({
            from: smtpFrom,
            to: studentEmail,
            subject: subject,
            html: emailHtml,
            icalEvent: {
              filename: "invite.ics",
              method: "REQUEST",
              content: icalContent
            },
            alternatives: [
              {
                contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
                content: icalContent
              }
            ]
          });
          console.log(`[REMINDER DAEMON] Email reminder dispatched successfully to: ${studentEmail}`);
        } catch (nodemailerErr) {
          console.error(`[REMINDER DAEMON] SMTP dispatch failed for recipient ${studentEmail}:`, nodemailerErr);
        }
      } else {
        console.log("-----------------------------------------");
        console.log(`[SIMULATED DAEMON DISPATCH] To: ${studentEmail}`);
        console.log(`[SIMULATED DAEMON DISPATCH] Subject: ${subject}`);
        console.log("-----------------------------------------");
      }
    }

    // Mark as successfully sent to prevent recurrent loops
    await markReminderSent(reminderKey);
    console.log(`[REMINDER DAEMON] Broadcast archived. Marked sent state for: ${reminderKey}\n=========================================\n`);

  } catch (broadcastErr) {
    console.error("[REMINDER DAEMON] Fatal broadcast error in logic execution:", broadcastErr);
  }
}

async function checkAndTriggerReminders(): Promise<{ checked: boolean; triggered: boolean }> {
  const status = await syncReminderStatus();
  const now = new Date();

  // Trigger point 1: June 6th 2026 at 8:00 PM IST => June 6th 14:30:00 UTC
  const targetJune6_8pm = new Date("2026-06-06T14:30:00Z");
  
  // Trigger point 2: June 7th 2026 at 10:00 AM IST => June 7th 04:30:00 UTC
  const targetJune7_10am = new Date("2026-06-07T04:30:00Z");
  
  let triggered = false;

  if (!status.june6_8pm_sent && now >= targetJune6_8pm) {
    const subject = "[URGENT] Z444 Masterclass starts Tomorrow Morning at 11:00 AM IST!";
    const fallback = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Get Ready for the Z444 Masterclass Tomorrow!</h1>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Bridging the Gap: Academic Studies to Industry Job Roles</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello \${studentName},</p>
          <p>This is a quick reminder that the highly anticipated <strong>Z444 Masterclass</strong> is scheduled to start <strong>tomorrow Sunday at 11:00 AM (IST) sharp</strong>.</p>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-weight: 700; color: #1e3a8a; font-size: 13.5px;">⚡ Live Joining Details:</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
              🗓️ <strong>Date:</strong> Tomorrow, Sunday, June 7th, 2026<br>
              ⏰ <strong>Time:</strong> 11:00 AM Indian Standard Time (IST)<br>
              📍 <strong>Live Room:</strong> Google Meet (Direct Entry Code)<br>
              🔗 <strong>Link to Join:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
            </p>
          </div>

          <p>Make sure to bring a notebook, pen, and your existing draft resume. We will dive straight into resume writing tactics, linkedin templates, cold emailing hacks, and engineering workflows to secure premium jobs and internships.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 masterclass team</strong>
          </p>
        </div>
      </div>
    `;
    const aiPrompt = `Write a professional, warm, yet urgent evening email reminder for the Z444 Masterclass which starts tomorrow morning at 11:00 AM IST.
Direct them to join Google Meet link: "https://meet.google.com/bwi-xehm-peg". Tell them to bring a pen, paper/notebook, and a copy of their draft resume (which we will tune live!). Emphasize starting sharp. Sign off with 'Warm regards Z444 masterclass team'.`;
    
    await broadcastReminder("june6_8pm_sent", subject, fallback, aiPrompt);
    triggered = true;
  }

  if (!status.june7_10am_sent && now >= targetJune7_10am) {
    const subject = "[Starting in 1 Hour!] Z444 Masterclass Live Classroom Link - 11:00 AM IST";
    const fallback = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Z444 Live in 1 Hour! 🚀</h1>
          <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 13px;">Bridging the Gap: College Studies to Industry Expectations</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p>Hello \${studentName},</p>
          <p>This is it! Exactly <strong>1 hour left</strong> before we go live for the highly anticipated <strong>Z444 Masterclass</strong>.</p>
          
          <div style="background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-weight: 700; color: #4338ca; font-size: 13.5px;">🔥 Access Information:</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ⏰ <strong>Time:</strong> 11:00 AM Indian Standard Time (IST) Sharp<br>
              📍 <strong>Venue:</strong> Google Meet live feed<br>
              🔗 <strong>Direct Meet Join link:</strong> <a href="https://meet.google.com/bwi-xehm-peg" style="color: #6366f1; font-weight: bold; text-decoration: underline;">https://meet.google.com/bwi-xehm-peg</a>
            </p>
          </div>

          <p>Ensure your device speakers are working, keep your draft resume and a book nearby, and login 5 minutes early to secure your spot. Let's build your pathway to a high-paying career starting today.</p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Warm regards,<br>
            <strong>Z444 masterclass team</strong>
          </p>
        </div>
      </div>
    `;
    const aiPrompt = `Write an exciting final direct-call email reminder for the Z444 Masterclass starting in exactly 1 hour (today Sunday at 11:00 AM IST).
Instruct them to log in 5 mins early to avoid buffer issues or platform capacity limitations. Highlight the direct Google Meet join link: "https://meet.google.com/bwi-xehm-peg". Keep it energetic and action-prompting. Sign off with 'Warm regards Z444 masterclass team'.`;
    
    await broadcastReminder("june7_10am_sent", subject, fallback, aiPrompt);
    triggered = true;
  }

  return { checked: true, triggered };
}

function startReminderDaemon() {
  console.log("[REMINDER DAEMON] Initialized background polling. Checking every 2 minutes.");
  
  // Checking every 2 minutes for precise triggering
  setInterval(async () => {
    try {
      await checkAndTriggerReminders();
    } catch (daemonLoopErr) {
      console.error("[REMINDER DAEMON] Loop tick processing error:", daemonLoopErr);
    }
  }, 120000); // Polling checks run secure background interval every 2 minutes (120,000ms)
}

// Start the daemon running on container startup (Only if not in a serverless environment like Vercel)
if (!process.env.VERCEL) {
  startReminderDaemon();
}

// Check Server Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", firebaseAvailable: !!firestoreDb, geminiAvailable: !!ai });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ success: false, error: err?.message || "Internal Server Error" });
});

// Vercel Cron Trigger Endpoint for serverless scheduled events
app.get("/api/cron-reminders", async (req, res) => {
  try {
    const result = await checkAndTriggerReminders();
    res.json({ success: true, message: "Reminders evaluation complete", ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// --- VITE MIDDLEWARE AND SPA FALLBACK ---

if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== "production") {
    import("vite").then(({ createServer: createViteServer }) => {
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then((vite) => {
        app.use(vite.middlewares);
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`[Vite Dev Mode] Server listening on http://localhost:${PORT}`);
        });
      }).catch((err) => {
        console.error("Vite server initialization failed:", err);
      });
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // In Express v4, use app.get('*', ...)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Production Mode] Server listening on http://localhost:${PORT}`);
    });
  }
}

export default app;
