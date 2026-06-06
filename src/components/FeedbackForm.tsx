/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Star, Send, ArrowLeft, Heart, CheckCircle, MessageSquare } from "lucide-react";
import { StudentFeedback, ValidationErrors } from "../types";

interface FeedbackFormProps {
  onBack: () => void;
}

export default function FeedbackForm({ onBack }: FeedbackFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const validate = (): boolean => {
    const tempErrors: ValidationErrors = {};
    if (!name.trim()) tempErrors.name = "Full name is required";
    
    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    if (!email.trim()) {
      tempErrors.email = "Email ID is required";
    } else if (!emailRegex.test(email.trim())) {
      tempErrors.email = "Please specify a valid student email ID";
    }

    if (rating === 0) {
      tempErrors.rating = "Please select a satisfaction rating";
    }

    if (!comments.trim()) {
      tempErrors.comments = "Feedback comments are required";
    } else if (comments.trim().length < 10) {
      tempErrors.comments = "Please share a few constructive thoughts (minimum 10 characters)";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/feedbackform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          rating,
          comments: comments.trim(),
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(result.message || "Feedback dispatch failed due to server rejection.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage("Network error occurred during feedback dispatch. Please verify your connection.");
    }
  };

  if (status === "success") {
    return (
      <div id="feedback-success" className="max-w-xl mx-auto space-y-6 text-center py-8">
        <div className="bg-gradient-to-b from-indigo-50 to-indigo-50/20 dark:from-indigo-950/20 dark:to-indigo-950/5 border border-indigo-150 dark:border-indigo-900/40 p-8 rounded-3xl text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/15 rounded-full blur-xl pointer-events-none" />
          
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-600/25">
            <Heart className="w-8 h-8 fill-indigo-200/25" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Thank You For Your Feedback!</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm max-w-sm mx-auto mt-3 leading-relaxed">
            Your valuable input has been successfully recorded. We analyze every single piece of feedback to continue optimizing the Z444 Masterclass series!
          </p>
        </div>

        <button
          onClick={onBack}
          className="px-5 py-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer border border-transparent dark:border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Admission Panel
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div id="feedback-form-card" className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-850/80 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-150/45 dark:shadow-none transition-all duration-300">
        
        {/* Header Block */}
        <div className="mb-6 flex items-start gap-4 justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4f46e5] bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 px-2.5 py-0.5 rounded-full">
              Post-Class Review
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1.5">Share Your Feedback</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Help us make the Z444 masterclass experience even more impactful!</p>
          </div>
          
          <button
            onClick={onBack}
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-200/40 dark:border-slate-850"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {status === "error" && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-semibold mb-5 leading-relaxed">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Student Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. John Doe"
              className={`w-full px-4 py-3 bg-slate-50 border hover:border-slate-300 dark:bg-slate-950 dark:hover:border-slate-800 rounded-2xl text-sm font-medium text-slate-950 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors ${
                errors.name ? "border-rose-300 dark:border-rose-900 focus:border-rose-500" : "border-slate-200 dark:border-slate-850"
              }`}
            />
            {errors.name && <p className="text-[11px] font-semibold text-rose-500">{errors.name}</p>}
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              placeholder="e.g. john@university.edu"
              className={`w-full px-4 py-3 bg-slate-50 border hover:border-slate-300 dark:bg-slate-950 dark:hover:border-slate-800 rounded-2xl text-sm font-medium text-slate-950 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors ${
                errors.email ? "border-rose-300 dark:border-rose-900 focus:border-rose-500" : "border-slate-200 dark:border-slate-850"
              }`}
            />
            {errors.email && <p className="text-[11px] font-semibold text-rose-500">{errors.email}</p>}
          </div>

          {/* Rating (1 to 5 Stars) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Overall Experience Rating
            </label>
            <div className="flex items-center gap-2 py-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setRating(star);
                    if (errors.rating) setErrors(prev => ({ ...prev, rating: undefined }));
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 text-slate-300 hover:scale-110 active:scale-95 hover:text-amber-400 transition-all cursor-pointer focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 stroke-[1.5px] ${
                      (hoverRating !== null ? star <= hoverRating : star <= rating)
                        ? "fill-amber-400 text-amber-500"
                        : "text-slate-300 dark:text-slate-700"
                    }`}
                  />
                </button>
              ))}
              
              {rating > 0 && (
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 px-2 rounded-lg ml-2">
                  {rating === 5 ? "Excellent 🌟" : rating === 4 ? "Very Good 👍" : rating === 3 ? "Good ok" : rating === 2 ? "Below Average" : "Needs Improvement"}
                </span>
              )}
            </div>
            {errors.rating && <p className="text-[11px] font-semibold text-rose-500">{errors.rating}</p>}
          </div>

          {/* Detailed Comments */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Detailed Comments & Key Learnings
            </label>
            <textarea
              rows={4}
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                if (errors.comments) setErrors(prev => ({ ...prev, comments: undefined }));
              }}
              placeholder="What did you learn? What can we do better? Share details..."
              className={`w-full px-4 py-3 bg-slate-50 border hover:border-slate-300 dark:bg-slate-950 dark:hover:border-slate-800 rounded-2xl text-sm font-medium text-slate-950 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors resize-none leading-relaxed ${
                errors.comments ? "border-rose-300 dark:border-rose-900 focus:border-rose-500" : "border-slate-200 dark:border-slate-850"
              }`}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>{comments.length}/2000 characters limit</span>
              {errors.comments && <span className="text-rose-500 font-semibold">{errors.comments}</span>}
            </div>
          </div>

          {/* Submission Button */}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider shadow-lg dark:shadow-indigo-600/10 focus:ring-2 focus:ring-indigo-500/20 outline-none select-none mt-2"
          >
            {status === "submitting" ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting Feedback...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Feedback entry</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
