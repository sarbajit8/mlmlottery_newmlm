import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSiteName } from '@/hooks/useSiteName';
import { isAdminPanelRole } from '@/store/authStore';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import {
  IconBike,
  IconCar,
  IconCheck,
  IconClock,
  IconHeadset,
  IconMapPin,
  IconNavigation,
  IconShieldCheck,
  IconStar,
  IconSwap,
  IconUserPlus,
  IconWallet,
} from '@/components/ui/icons';

const img = (id: string, w: number, q = 72) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;

const HERO_IMG = img('1600320254374-ce2d293c324e', 1200); // driver navigating with a mounted ride-app phone
const DRIVER_BANNER_IMG = img('1449965408869-eaa3f722e40d', 1600); // driver POV, dusk

const stats = [
  { value: '2M+', label: 'Rides completed' },
  { value: '15,000+', label: 'Verified drivers' },
  { value: '50+', label: 'Cities covered' },
  { value: '4.9★', label: 'Average rating' },
];

const steps = [
  {
    icon: IconMapPin,
    title: 'Set Your Route',
    description: 'Enter your pickup point and destination — we instantly match you with the nearest available driver.',
  },
  {
    icon: IconCar,
    title: 'Choose Your Ride',
    description: 'Pick from Bike, Economy, Premium or SUV. See the upfront fare before you confirm — no surprises.',
  },
  {
    icon: IconNavigation,
    title: 'Track & Arrive',
    description: 'Watch your driver approach in real time, ride in comfort, and pay however suits you — cash or card.',
  },
];

const fleet = [
  { icon: IconBike, name: 'Bike', description: 'Quick solo trips, beat the traffic', price: '₹49', image: img('1558981806-ec527fa84c39', 640) },
  { icon: IconCar, name: 'Economy', description: 'Affordable everyday rides', price: '₹99', image: img('1541899481282-d53bffe3c35d', 640) },
  { icon: IconCar, name: 'Premium', description: 'Newer cars, extra legroom', price: '₹179', image: img('1580273916550-e323be2ae537', 640) },
  { icon: IconCar, name: 'SUV / XL', description: 'Extra seats for groups & luggage', price: '₹249', image: img('1519641471654-76ce0107ad1b', 640) },
];

const features = [
  { icon: IconShieldCheck, title: 'Verified Drivers', description: 'Every driver passes a background check and document verification before their first ride.' },
  { icon: IconNavigation, title: 'Live GPS Tracking', description: 'Share your trip with anyone and watch your route update in real time from pickup to drop-off.' },
  { icon: IconWallet, title: 'Cashless Payments', description: 'Pay by card, wallet, or cash — fares are calculated upfront so there are never any surprises.' },
  { icon: IconHeadset, title: '24/7 Support', description: 'A real support team is always on call for trip issues, lost items, or ride emergencies.' },
  { icon: IconClock, title: 'On-Time, Every Time', description: 'Smart dispatch keeps wait times low, even during peak hours and rush-hour traffic.' },
  { icon: IconStar, title: 'Rated & Reviewed', description: 'Two-way ratings keep quality high — you know exactly who is picking you up, every time.' },
];

const testimonials = [
  { quote: 'Booked a ride at midnight and a driver was outside in under four minutes. Genuinely the most reliable app I use.', name: 'Ananya R.', city: 'Mumbai' },
  { quote: 'Fares are upfront and drivers are always polite and on time. Switched from every other app to this one.', name: 'Karan M.', city: 'Bengaluru' },
  { quote: 'Driving for them has been the most flexible income I’ve had — I set my own hours and payouts are instant.', name: 'Sunil D.', city: 'Partner Driver' },
];

/** Light, non-primary button styled to match this page's white theme — the shared Button
 * component's secondary/ghost variants are tuned for the app's dark screens, so nav-level
 * "Login" links here are hand-styled instead of fighting that with overrides. */
function LightLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50',
        className,
      )}
    >
      {children}
    </Link>
  );
}

function Nav({ registerHref }: { registerHref: string }) {
  const { companyName } = useSiteName();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9 rounded-xl text-sm shadow-lg shadow-amber-500/20" />
          <span className="text-sm font-semibold text-slate-900">{companyName}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <LightLink to="/login">Login</LightLink>
          <Link to={registerHref}>
            <Button size="sm" icon={<IconCar className="h-4 w-4" />}>
              Become a Driver
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function BookingCard({ registerHref }: { registerHref: string }) {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  const swap = () => {
    setPickup(drop);
    setDrop(pickup);
  };

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <IconMapPin className="h-3.5 w-3.5" />
          </span>
          <input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Pickup location"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <IconMapPin className="h-3.5 w-3.5" />
          </span>
          <input
            value={drop}
            onChange={(e) => setDrop(e.target.value)}
            placeholder="Drop-off location"
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={swap}
          aria-label="Swap pickup and drop-off"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:text-amber-600"
        >
          <IconSwap className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-500">
          <IconClock className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm text-slate-400">Pickup now — or schedule for later</span>
      </div>

      <Link to={registerHref} className="mt-4 block">
        <Button size="lg" className="w-full justify-center" icon={<IconCheck className="h-4.5 w-4.5" />}>
          Check Ride Availability
        </Button>
      </Link>
    </div>
  );
}

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const { companyName } = useSiteName();
  const [params] = useSearchParams();
  const ref = params.get('ref');
  const registerHref = ref ? `/join?ref=${ref}` : '/join';

  if (isAuthenticated) {
    return <Navigate to={isAdminPanelRole(user?.role) ? '/admin' : '/agent'} replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Nav registerHref={registerHref} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/70 via-white to-white">
        <div className="pointer-events-none absolute -top-24 right-[-120px] h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="pointer-events-none absolute left-[-140px] top-40 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pb-16 pt-14 sm:pt-20 lg:grid-cols-2 lg:items-center lg:gap-8">
          <div>
            {ref && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs text-emerald-700">
                <IconUserPlus className="h-3.5 w-3.5" />
                You've been invited to drive with us by referral code <span className="font-mono font-semibold">{ref}</span>
              </div>
            )}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700">
              <IconCar className="h-3.5 w-3.5" />
              Now live in 50+ cities, available 24/7
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-6xl">
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Your Ride,</span>
              <br /> Just a Tap Away.
            </h1>
            <p className="mt-6 max-w-lg text-base text-slate-500 sm:text-lg">
              Safe, reliable rides across the city — day or night. Verified drivers, upfront fares, and live tracking
              on every trip from the moment you book to the moment you arrive.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar key={i} className={cn('h-4 w-4', i < 5 ? 'text-amber-400' : 'text-slate-200')} />
              ))}
              <span className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">4.9/5</span> from 2M+ riders
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10">
              <img
                src={HERO_IMG}
                alt="Driver navigating with a phone-mounted ride app, another car ahead on the road"
                className="h-72 w-full object-cover sm:h-96 lg:h-[420px]"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-900/10 sm:left-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-slate-700">128 drivers online near you</span>
            </div>
            <div className="absolute -top-4 right-4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-lg shadow-slate-900/10 sm:right-6">
              <IconStar className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-800">4.9 rated</span>
            </div>
          </div>
        </div>

        {/* Booking widget */}
        <div className="relative mx-auto max-w-2xl px-6 pb-16">
          <BookingCard registerHref={registerHref} />
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm font-medium text-slate-500 transition-colors hover:text-amber-600">
              Already have an account? Login →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-semibold text-slate-900 sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-amber-600">How It Works</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mb-1.5 text-xs font-medium text-slate-400">Step {i + 1}</p>
              <h3 className="mb-2 text-base font-semibold text-slate-900">{s.title}</h3>
              <p className="text-sm text-slate-500">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-emerald-600">Choose Your Ride</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {fleet.map((f) => (
              <div
                key={f.name}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="h-28 overflow-hidden sm:h-32">
                  <img
                    src={f.image}
                    alt={`${f.name} ride option`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{f.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500">{f.description}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    From <span className="font-semibold text-slate-700">{f.price}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-amber-600">Why Ride With Us</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-emerald-600">Riders & Partners Love Us</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <IconStar key={i} className="h-3.5 w-3.5" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-xs font-medium text-slate-400">
                  {t.name} <span className="text-slate-300">·</span> {t.city}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner with photo */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl">
          <img src={DRIVER_BANNER_IMG} alt="Driver's view on the road at dusk" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/75 to-neutral-950/40" />
          <div className="relative px-8 py-14 text-center sm:px-16 sm:py-20">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Ready to hit the road?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
              Sign up as a driver-partner and start earning on your own schedule, or log in if you're already part of
              the fleet.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={registerHref}>
                <Button icon={<IconCar className="h-4 w-4" />}>Become a Driver</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" accent="slate">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {companyName}. All rights reserved.
      </footer>
    </div>
  );
}
