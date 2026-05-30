import { Outlet } from "react-router-dom";

export default function ExamLayout() {
  return (
    <div className="exam-shell min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
