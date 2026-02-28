import { Link } from "react-router-dom";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-[Arimo,sans-serif]">
      {/* Hero */}
      <section className="relative text-white overflow-hidden min-h-[200px] sm:min-h-[260px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2e6b4e] to-[#255a43]" />
        <div className="absolute inset-0 bg-[#1e3d32]/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight drop-shadow-sm">
            About Eventure
          </h1>
          <p className="text-lg text-white/90 mt-2 max-w-2xl">
            Built by students at New England Institute of Technology to help people discover and connect at events.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Founders / How Eventure Started */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden mb-10">
          <div className="aspect-[4/3] sm:aspect-[5/3] bg-[#f8fafc] flex items-center justify-center p-4">
            <img
              src="/founders.png"
              alt="Joel Mayorga and Leynadth Sosa Ortiz, founders of Eventure"
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
            />
          </div>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0f172b] mb-4">
              How Eventure Started
            </h2>
            <div className="text-[#475569] leading-relaxed space-y-3 text-sm sm:text-base">
              <p>
                Eventure was built by <strong className="text-[#0f172b]">Joel Mayorga</strong> and <strong className="text-[#0f172b]">Leynadth Sosa Ortiz</strong> as our senior project at New England Institute of Technology. We wanted a place where finding events—concerts, meetups, workshops, whatever—didn’t feel like a chore. So we made one.
              </p>
              <p>
                We’re both battling depression, but we’re still doing our best to succeed and build something that helps people connect. Eventure is about keeping it simple: browse, RSVP, and show up. No clutter, no hassle—just events that matter to you.
              </p>
              <p>
                Our goal is simple: <strong className="text-[#2e6b4e]">make event discovery easy and help people connect.</strong> Thanks for being here—we hope you find something great.
              </p>
            </div>
            <p className="mt-4 text-sm text-[#64748b] font-medium">Built with you in mind</p>
          </div>
        </section>

        {/* Location */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2e6b4e]/10 text-[#2e6b4e] shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#0f172b]">Where we built it</h2>
          </div>
          <p className="text-[#475569] text-sm sm:text-base leading-relaxed">
            Eventure was created at <strong className="text-[#0f172b]">New England Institute of Technology (NEIT)</strong> in <strong className="text-[#0f172b]">East Greenwich, Rhode Island</strong>. Our campus in the Ocean State is where we designed, built, and launched the platform—and where we continue to improve it for event organizers and attendees everywhere.
          </p>
          <p className="mt-3 text-[#64748b] text-sm">
            New England Institute of Technology · East Greenwich, RI
          </p>
        </section>

        {/* Mission */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2e6b4e]/10 text-[#2e6b4e] shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#0f172b]">Our mission</h2>
          </div>
          <p className="text-[#475569] text-sm sm:text-base leading-relaxed">
            We believe finding events should be easy and stress-free. Eventure helps you discover what’s happening near you, RSVP in one click, and show up—so you spend less time searching and more time connecting.
          </p>
        </section>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2e6b4e] text-white rounded-xl font-semibold hover:bg-[#255a43] transition-colors shadow-sm"
          >
            Browse events
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
