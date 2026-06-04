import { Link } from "react-router-dom";
import liveImg from "../assets/liveImg.png";
import shareImg from "../assets/shareImg.png";
import leaderBoardImg from "../assets/leaderBoardImg.png";
import analyticsImg from "../assets/analyticsImg.png";

const productFeatures = [
  {
    title: "Live quizzes",
    desc: "Run timed or self-paced quizzes in sessions.",
    img: liveImg,
  },
  {
    title: "Share a link",
    desc: "Participants join instantly—no app download.",
    img: shareImg,
  },
  {
    title: "Leaderboards",
    desc: "See rankings and scores as answers come in.",
    img: leaderBoardImg,
  },
  {
    title: "Analytics",
    desc: "Review performance and question insights.",
    img: analyticsImg,
  },
];

const benefits = [
  {
    pos: 1,
    title: "Intuitive and easy",
    text: "Participants join with a link or code. Hosts set up a quiz in minutes.",
  },
  {
    pos: 2,
    title: "Flexible question types",
    text: "Multiple choice and more formats to match how you teach or train.",
  },
  {
    pos: 3,
    title: "Get started for free",
    text: "Try QuizHub on the free plan—upgrade when you need more.",
  },
];

const testimonials = [
  {
    quote:
      "QuizHub made our weekly team check-ins more engaging. Everyone participates, not just the loudest voice in the room.",
    name: "Alex Rivera",
    role: "Team Lead, Remote Co.",
  },
  {
    quote:
      "I use it in class every Friday. Students actually look forward to the quiz now.",
    name: "Priya Sharma",
    role: "High school teacher",
  },
];

export default function Home() {
  return (
    <>
      <section className="bg-white pt-12 pb-16 md:pt-16 md:pb-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-5xl lg:text-[3.25rem]">
            Quizzes made easy for every audience
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
            QuizHub helps you engage participants, capture their answers, and
            make everyone feel included, whether you&apos;re teaching a class,
            training a team, or hosting an event.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="w-full rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
            >
              Sign up free
            </Link>
            <a
              href="#features"
              className="w-full rounded-full border border-line bg-white px-8 py-3 text-sm font-semibold text-ink transition hover:bg-surface-soft sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* Integrations strip */}
      <section className="border-y border-line bg-surface-soft py-10">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-sm font-extrabold uppercase tracking-wide text-muted">
            Works for classrooms, meetings, and events
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-bold opacity-80 *:bg-slate-200 *:rounded-2xl *:p-2 text-slate-400">
            {[
              "Education",
              "Corporate training",
              "Workshops",
              "Conferences",
              "Remote teams",
            ].map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid — like Slido's Live polls / Q&A / Quizzes row */}
      <section id="features" className="scroll-mt-24 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              It&apos;s how you include everyone
            </h2>
            <p className="mt-4 text-lg text-muted">
              Everything you need to run quizzes people actually want to answer.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {productFeatures.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl border border-line bg-white p-6 text-center transition hover:border-brand-200 hover:shadow-md hover:shadow-brand-600/5"
              >
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  {f.img ? (
                    <img className="text-lg font-bold" src={f.img} alt={`${f.title} icon`} />
                  ) : (
                    <span className="text-lg font-bold">✓</span>
                  )}
                </div>
                <h3 className="mt-4 font-bold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {f.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Value section */}
      <section
        id="how-it-works"
        className="scroll-mt-24 border-t border-line bg-surface-muted py-16 md:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              Simple for hosts. Easy for participants.
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.pos} className="rounded-2xl bg-white p-8 shadow-sm">
                <h3 className="text-lg font-bold text-ink">
                  {" "}
                  {b.pos}) {b.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-muted">
            Trusted by educators and teams
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {testimonials.map((t) => (
              <blockquote
                key={t.name}
                className="rounded-2xl border border-line bg-white p-8 shadow-sm"
              >
                <p className="text-lg leading-relaxed text-ink">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-6">
                  <p className="font-semibold text-ink">{t.name}</p>
                  <p className="text-sm text-muted">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section
        id="pricing"
        className="scroll-mt-24 border-t border-line bg-surface-soft py-16"
      >
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold text-ink md:text-3xl">
            Get started for free
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Start with our free plan during beta. Create quizzes, share links,
            and review results at no cost.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Create free account
          </a>
        </div>
      </section>

      {/* Bottom CTA band — Slido-style */}
      <section className="bg-brand-600 py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold text-white md:text-3xl">
            Make your sessions more interactive with QuizHub
          </h2>
          <Link
            to="/login"
            className="mt-8 inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Sign up free
          </Link>
        </div>
      </section>

    </>
  );
}
