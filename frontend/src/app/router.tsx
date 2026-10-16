import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import RootLayout from "../layouts/RootLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ExamLayout from "../layouts/ExamLayout";
import RouteError from "../components/errors/RouteError";
import RequireAuth from "../components/auth/RequireAuth";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each page becomes its own JS chunk, loaded only when that route is visited.
const Home = lazy(() => import("../pages/Home"));
const About = lazy(() => import("../pages/About"));
const Login = lazy(() => import("../pages/Login"));
const NotFound = lazy(() => import("../pages/errors/NotFound"));
const DashboardHome = lazy(() => import("../pages/dashboard/DashboardHome"));
const SessionLobby = lazy(() => import("../pages/dashboard/SessionLobby"));
const CreateSession = lazy(() => import("../pages/dashboard/CreateSession"));
const DashboardAnalytics = lazy(() => import("../pages/dashboard/Analytics"));
const DashboardProfile = lazy(() => import("../pages/dashboard/Profile"));
const QuestionBank = lazy(() => import("../pages/dashboard/QuestionBank"));
const SessionReport = lazy(() => import("../pages/dashboard/SessionReport"));
const Practice = lazy(() => import("../pages/dashboard/Practice"));
const ShowTheExam = lazy(() => import("../pages/exam/ShowTheExam"));
const ShowExamLeaderBoard = lazy(() => import("../pages/exam/ShowExamLeaderBoard"));

// ── Minimal loading fallback (no layout shift) ────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <span className="relative flex h-10 w-10">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-50" />
        <span className="relative inline-flex h-10 w-10 rounded-full bg-brand-600" />
      </span>
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <S><Home /></S>,
      },
      {
        path: "about",
        element: <S><About /></S>,
      },
      {
        path: "login",
        element: <S><Login /></S>,
      },
      {
        path: "*",
        element: <S><NotFound /></S>,
      },
    ],
  },
  {
    path: "room/:code/join",
    element: <ExamLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <S><ShowTheExam /></S>,
      },
      {
        path: "leaderboard",
        element: <S><ShowExamLeaderBoard /></S>,
      },
    ],
  },
  {
    path: "dashboard",
    element: <DashboardLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <S><DashboardHome /></S>,
      },
      {
        path: "session/:code",
        element: <S><SessionLobby /></S>,
      },
      {
        path: "session/:code/report",
        element: <S><SessionReport /></S>,
      },
      {
        path: "questions",
        element: <S><QuestionBank /></S>,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "practice/:slug",
            element: <S><Practice /></S>,
          },
        ],
      },
      {
        path: "analytics",
        element: <S><DashboardAnalytics /></S>,
      },
      {
        path: "profile",
        element: <S><DashboardProfile /></S>,
      },
      {
        path: "create",
        element: <S><CreateSession /></S>,
      },
      {
        path: "*",
        element: <S><NotFound /></S>,
      },
    ],
  },
]);
