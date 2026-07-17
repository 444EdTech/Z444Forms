/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import RegistrationForm from "./components/RegistrationForm";
import ResumeSubmissionForm from "./components/ResumeSubmissionForm";
import NewRegistrationForm from "./components/NewRegistrationForm";
import AdminDashboard from "./components/AdminDashboard";
import FeedbackForm from "./components/FeedbackForm";
import CommunityRegistrationForm from "./components/CommunityRegistrationForm";
import MockInterviewAdmin from "./components/MockInterviewAdmin";
import MockInterviewList from "./components/MockInterviewList";
import { StudentRegistration } from "./types";
import Z444Logo from "./components/Z444Logo";
import { 
  GraduationCap, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Mail, 
  CheckCircle, 
  ArrowLeft,
  ChevronRight,
  Database,
  ExternalLink,
  ShieldCheck,
  Send,
  Sliders,
  Maximize2,
  Share2,
  Copy,
  Check,
  CalendarPlus,
  Sun,
  Moon,
  MessageSquare,
  Video
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  
  const activeTab = (currentPath === "/z444space" || currentPath.endsWith("/z444space")) 
    ? "admin" 
    : (currentPath === "/z444spacemock" || currentPath.endsWith("/z444spacemock"))
      ? "mockadmin"
      : (currentPath === "/mock-interviews" || currentPath.endsWith("/mock-interviews"))
        ? "mocklist"
        : (currentPath === "/feedbackform" || currentPath.endsWith("/feedbackform"))
      ? "feedback"
      : (currentPath === "/community" || currentPath.endsWith("/community") || currentPath === "/joincommunity" || currentPath.endsWith("/joincommunity"))
        ? "community"
        : (currentPath === "/masterclass-registration" || currentPath.endsWith("/masterclass-registration") || currentPath === "/register" || currentPath.endsWith("/register"))
          ? "register"
          : (currentPath === "/z444C1" || currentPath.endsWith("/z444C1"))
            ? "z444c1"
            : "home";
  
  // Registration Success state
  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  const handleRegistrationSuccess = (payload: {
    registration: StudentRegistration;
    simulatedEmail: string;
    cloudSync: boolean;
    emailSent: boolean;
  }) => {
    setRegistrationSuccess(payload);
  };

  const handleResetForm = () => {
    setRegistrationSuccess(null);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col ${isDarkMode ? "dark" : ""}`}>
      
      {/* Decorative top header accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
      
      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        
        {/* Masthead Header bar */}
        <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-6 transition-colors duration-300">
          <div className="flex gap-3.5 items-center">
            {/* Elegant logo mark */}
            <Z444Logo variant="black-bg" size={56} className="shadow-lg hover:scale-110 active:scale-95 transition-all outline-none shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ef4444] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-2.5 py-0.5 rounded-full transition-colors">
                  Z444
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#3b82f6] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2.5 py-0.5 rounded-full transition-colors">
                  Masterclass Series
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">Z444 Masterclass</h1>
            </div>
          </div>

          {/* Action Area & Theme Selector Toggle */}
          <div className="flex items-center gap-3.5 self-start md:self-auto">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle Theme Mode"
              className="p-2.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all duration-200 border border-slate-200/60 dark:border-slate-800 cursor-pointer flex items-center justify-center shadow-sm relative overflow-hidden"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {isDarkMode ? (
                  <motion.div
                    key="sun"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex justify-center items-center"
                  >
                    <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex justify-center items-center"
                  >
                    <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/15" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Header Action / Badge based on current path */}
            {activeTab === "admin" ? (
              <div className="flex items-center gap-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Control Room
                </span>
                <button
                  onClick={() => navigateTo("/z444spacemock")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  <Users className="w-3.5 h-3.5" />
                  Mock Manager
                </button>
                <button
                  onClick={() => navigateTo("/")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Student Portal
                </button>
              </div>
            ) : activeTab === "mockadmin" ? (
              <div className="flex items-center gap-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/60 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  Mock Manager
                </span>
                <button
                  onClick={() => navigateTo("/z444space")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Control Room
                </button>
                <button
                  onClick={() => navigateTo("/")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Student Portal
                </button>
              </div>
            ) : activeTab === "mocklist" ? (
              <div className="flex items-center gap-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Interview Schedule
                </span>
                <button
                  onClick={() => navigateTo("/")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              </div>
            ) : activeTab === "feedback" ? (
              <div className="flex items-center gap-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Feedback
                </span>
                <button
                  onClick={() => navigateTo("/")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Student Portal
                </button>
              </div>
            ) : activeTab === "community" ? (
              <div className="flex items-center gap-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-fade-in">
                  <Users className="w-3.5 h-3.5" />
                  Premium Community
                </span>
                <button
                  onClick={() => navigateTo("/")}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Student Portal
                </button>
              </div>
            ) : activeTab === "home" ? null : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateTo("/community")}
                  className="px-3 py-1.5 text-xs font-extrabold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 hover:bg-emerald-100/75 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 transition-all rounded-xl flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-95 shadow-sm"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  Join Community (INR 244)
                </button>
                <button
                  onClick={() => navigateTo("/feedbackform")}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100/70 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/60 transition-colors rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Feedback Form
                </button>
                <button
                  onClick={() => navigateTo("/")}
                  className="px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 cursor-pointer hover:scale-[1.03] active:scale-95 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-indigo-500" />
                  Profile Submission
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Tab contents */}
        <div id="portal-viewspace" className="relative">
          <AnimatePresence mode="wait">
            
            {activeTab === "feedback" ? (
              <motion.div
                key="feedback-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <FeedbackForm onBack={() => navigateTo("/")} />
              </motion.div>
            ) : activeTab === "community" ? (
              <motion.div
                key="community-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <CommunityRegistrationForm onBack={() => navigateTo("/")} />
              </motion.div>
            ) : activeTab === "register" ? (
              <motion.div
                key="register-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                 {!registrationSuccess ? (
                  <RegistrationForm onSuccess={handleRegistrationSuccess} />
                 ) : (
                  /* Success portal layout matching the beautiful spec design */
                  <div id="receipt-screen" className="max-w-2xl mx-auto space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
                    <div className="bg-gradient-to-b from-emerald-50 to-emerald-50/20 dark:from-emerald-950/20 dark:to-emerald-950/5 border border-emerald-100 dark:border-emerald-900/60 p-8 rounded-3xl text-center shadow-lg shadow-emerald-50/30 dark:shadow-none relative overflow-hidden transition-colors duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 dark:bg-emerald-800/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Seat Registration Successful!</h2>
                      <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                        Congratulations, <strong>{registrationSuccess.registration.name}</strong>! Your seat is secured. A direct Google Meet invite has been dispatched to your email (<strong>{registrationSuccess.registration.email}</strong>).
                      </p>
                    </div>

                    {/* Masterclass session details & quick actions card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-xl shadow-slate-150/45 dark:shadow-none p-6 md:p-8 space-y-6 transition-colors duration-300">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Session Joiner Checklist
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-start gap-3">
                          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-1 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">Date & Time</p>
                            <p className="text-sm font-bold text-slate-950 dark:text-white mt-1">June 7th, 2026 (Sunday)</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">11:00 AM IST (Sharp)</p>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-1 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">Live Platform</p>
                            <p className="text-sm font-bold text-slate-950 dark:text-white mt-1">Google Meet</p>
                            <a 
                              href="https://meet.google.com/bwi-xehm-peg" 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              meet.google.com/bwi-xehm-peg
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Immediate action buttons: Add to Calendar & Join Meet */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                        <a 
                          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Z444+Masterclass:+Bridging+the+Gap+between+College+%26+Industry&dates=20260607T053000Z/20260607T073000Z&details=Masterclass+to+bridge+the+gap+between+college+learnings+and+true+industry+expectations.+Google+Meet+Link:+https://meet.google.com/bwi-xehm-peg&location=https://meet.google.com/bwi-xehm-peg`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-600/10 text-center"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Add to Google Calendar
                        </a>

                        <a 
                          href="https://meet.google.com/bwi-xehm-peg"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-md text-center"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Join Live Google Meet
                        </a>
                      </div>
                    </div>

                    {/* Share with Friends section */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 space-y-5 shadow-xl relative overflow-hidden border border-slate-800">
                      {/* background ambient blur */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/10 rounded-xl border border-white/10 shrink-0 text-indigo-400">
                          <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-base tracking-tight">Share with Your Peers</h4>
                          <p className="text-xs text-indigo-200/70 mt-1">
                            Don't keep the masterclass a secret. Share this registration link to help your friends accelerate their B.Tech careers together!
                          </p>
                        </div>
                      </div>

                      {/* Display Text Area */}
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-indigo-200 select-all leading-relaxed whitespace-pre-wrap break-words">
                        {`Hey! I just registered for the Z444 Masterclass on June 7th (Sunday, 11:00 AM IST) - "Bridging the Gap between College & Industry". It covers high-paying resume strategies, portfolio-building, and direct internship outreach workflows. You should register too! Here is the registration portal link: ${window.location.origin}`}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            const shareText = `Hey! I just registered for the Z444 Masterclass on June 7th (Sunday, 11:00 AM IST) - "Bridging the Gap between College & Industry". It covers high-paying resume strategies, portfolio-building, and direct internship outreach workflows. You should register too! Here is the registration portal link: ${window.location.origin}`;
                            navigator.clipboard.writeText(shareText);
                            setCopiedShare(true);
                            setTimeout(() => setCopiedShare(false), 2000);
                          }}
                          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          {copiedShare ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copied Invite!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy Invite Message</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                            `Hey! I just registered for the Z444 Masterclass on June 7th (Sunday, 11:00 AM IST) - "Bridging the Gap between College & Industry". It covers high-paying resume strategies, portfolio-building, and direct internship outreach workflows. You should register too! Here is the registration portal link: ${window.location.origin}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-3 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-[#25d366] font-bold text-xs rounded-xl border border-[#25d366]/30 inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Share on WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* Reset button to register another student */}
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={handleResetForm}
                        className="px-5 py-3 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Registration Desk
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : activeTab === "admin" ? (
              <motion.div
                key="admin-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <AdminDashboard />
              </motion.div>
            ) : activeTab === "mockadmin" ? (
              <motion.div
                key="mockadmin-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <MockInterviewAdmin />
              </motion.div>
            ) : activeTab === "mocklist" ? (
              <motion.div
                key="mocklist-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <MockInterviewList />
              </motion.div>
            ) : activeTab === "z444c1" ? (
              <motion.div
                key="z444c1-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <NewRegistrationForm />
              </motion.div>
            ) : (
              <motion.div
                key="home-flow"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, cubicBezier: [0.16, 1, 0.3, 1] }}
              >
                <ResumeSubmissionForm />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>

      {/* Styled minimal footer */}
      <footer className="w-full border-t border-slate-200/50 dark:border-slate-800 py-6 mt-16 bg-white dark:bg-slate-900 text-center text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide uppercase transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Z444 masterclass series.</p>
          <div className="flex gap-4 items-center font-bold text-indigo-500">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Coordinate inbox:</span>
            <a href="mailto:444edtech@gmail.com" className="hover:underline text-indigo-500 dark:text-indigo-400">444edtech@gmail.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
