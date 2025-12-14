"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

interface InvitationDetails {
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  org: {
    name: string;
    createdAt: string;
  };
  inviter: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    // Fetch invitation details
    fetch(`/api/invitations/accept?token=${token}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.invitation) {
          setInvitation(data.invitation);
        } else {
          setError("Invalid response from server");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Invitation fetch error:", err);
        setError(`Failed to load invitation: ${err.message}`);
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to accept invitation");
        setAccepting(false);
        return;
      }

      // Success - redirect to app
      router.push("/market-desk");
    } catch (error) {
      setError("Failed to accept invitation");
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    signIn(undefined, { callbackUrl: `/accept-invite?token=${token}` });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  // Check if user is logged in
  if (sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              You've Been Invited!
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {invitation.inviter.name || invitation.inviter.email} has invited you to join{" "}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {invitation.org.name}
              </span>
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Email:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{invitation.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Role:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{invitation.role}</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
            Sign in or create an account with <strong>{invitation.email}</strong> to accept this invitation
          </p>

          <button
            onClick={handleSignIn}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign In to Accept
          </button>
        </div>
      </div>
    );
  }

  // Check if logged in with correct email
  if (session?.user?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Wrong Account
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This invitation is for <strong>{invitation.email}</strong>, but you're signed in as{" "}
            <strong>{session?.user?.email}</strong>.
          </p>
          <button
            onClick={handleSignIn}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign In with Correct Account
          </button>
        </div>
      </div>
    );
  }

  // User is logged in with correct email - show accept button
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Accept Invitation
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {invitation.inviter.name || invitation.inviter.email} has invited you to join{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {invitation.org.name}
            </span>
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Your Role:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{invitation.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Invited By:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {invitation.inviter.name || invitation.inviter.email}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {accepting ? "Accepting..." : "Accept Invitation"}
        </button>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
