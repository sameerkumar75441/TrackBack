import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import useAuth from "./hooks/useAuth.js";
import api from "./services/api.js";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./index.css";

const categories = [
  "electronics",
  "accessories",
  "documents",
  "clothing",
  "keys",
  "bags",
  "jewellery",
  "other",
];
const label = (s) => (s || "").replaceAll("_", " ");
const successMessage = (message) => /submitted|saved|updated|assigned|approved|rejected|completed|thank you|scheduled/i.test(message || "");
function Alert({ message }) {
  const [dismissedMessage, setDismissedMessage] = useState("");

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => setDismissedMessage(message), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || dismissedMessage === message) return null;
  return <div className={`alert ${successMessage(message) ? "success" : "error"}`} role="alert">{message}</div>;
}
const Button = ({ children, variant = "primary", ...props }) => (
  <button className={`button ${variant}`} {...props}>
    {children}
  </button>
);
const Status = ({ value }) => (
  <span className={`badge ${value}`}>{label(value)}</span>
);
function Field({ label: text, children, required = true, ...props }) {
  return (
    <label className="field">
      <span>{text}</span>
      {children || <input required={required} {...props} />}
    </label>
  );
}
function Empty({ text, action }) {
  return (
    <div className="empty">
      <div>⌁</div>
      <h3>Nothing here yet</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Notifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      setError("");
      setLoading(true);
      setData(await api.get("/notifications"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        if (active) setError("");
        const result = await api.get("/notifications");
        if (active) setData(result);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadNotifications();
    window.addEventListener("trackback:notifications-changed", loadNotifications);
    return () => {
      active = false;
      window.removeEventListener(
        "trackback:notifications-changed",
        loadNotifications,
      );
    };
  }, []);
  const read = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  const readAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="notifications">
      <Button variant="ghost" onClick={() => setOpen(!open)}>
        Alerts{data.unreadCount ? ` (${data.unreadCount})` : ""}
      </Button>
      {open && (
        <div className="notification-panel">
          <div className="section-head">
            <b>Notifications</b>
            {data.unreadCount > 0 && (
              <button className="link-button" onClick={readAll}>
                Mark all read
              </button>
            )}
          </div>
          {error && <Alert message={error} />}{" "}
          {loading ? (
            <p className="muted">Loading notifications…</p>
          ) : data.notifications.length ? (
            data.notifications.map((n) => (
              <button
                className={`notification ${n.read ? "" : "unread"}`}
                key={n._id}
                onClick={() => read(n._id)}
              >
                <b>{n.title}</b>
                <span>{n.message}</span>
              </button>
            ))
          ) : (
            <p className="muted">You are all caught up.</p>
          )}
        </div>
      )}
    </div>
  );
}

function PublicLayout({ children }) {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const workspace = user?.role === "admin" ? "/admin" : user?.role === "security" ? "/security" : "/dashboard";
  return (
    <div className="public-app">
      <header className="public-header">
        <Link className="brand" to="/">
          <b>↩</b><span>TrackBack<small>Campus recovery</small></span>
        </Link>
        <button className="menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>☰</button>
        <nav className={`public-nav ${open ? "open" : ""}`}>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/items">Browse Items</NavLink>
          <NavLink to="/about">About Us</NavLink>
          {!ready ? null : user ? <Link className="button ghost" to={workspace}>Open workspace</Link> : <><Link to="/login">Login</Link><Link className="button" to="/signup">Register</Link></>}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="public-footer">
        <div className="brand"><b>↩</b><span>TrackBack<small>Verified campus recovery</small></span></div>
        <p>Making campus lost-and-found recovery organized, secure, and verifiable.</p>
        <div className="footer-links"><Link to="/">Home</Link><Link to="/items">Browse Items</Link><Link to="/about">About Us</Link><Link to="/login">Login</Link><Link to="/signup">Register</Link></div>
        <small>© {new Date().getFullYear()} TrackBack</small>
      </footer>
    </div>
  );
}

function Home() {
  const steps = [["01", "Report clearly", "Submit a lost or found report with the details that help recovery."], ["02", "Compare safely", "TrackBack helps bring related reports together for review."], ["03", "Verify ownership", "Private ownership details are checked by authorized staff."], ["04", "Recover securely", "Use scheduled pickup and a one-time QR handover."]];
  const features = [["◌", "Lost & Found Reports", "Clear campus reports with search, filters, images, and moderation."], ["⌕", "Smart Item Matching", "Deterministic rules, text similarity, and image comparison support discovery."], ["✓", "Ownership Verification", "Private claim evidence is available only to authorized reviewers."], ["▣", "Secure QR Handover", "One-time QR verification and college ID confirmation protect recovery."], ["◔", "Notifications", "Stay informed about claim, pickup, and handover progress."], ["⌂", "Campus Recovery", "A connected workflow for students, security teams, and admins."]];
  return <PublicLayout><section className="home-hero"><div><p className="eyebrow">VERIFIED CAMPUS RECOVERY</p><h1>Bring campus belongings <i>back</i> to their people.</h1><p>TrackBack organizes lost-property reporting, verified ownership claims, and secure handover in one trusted campus workflow.</p><div className="actions"><Link className="button" to="/items">Browse items</Link><Link className="button secondary" to="/report/lost">Report lost item</Link><Link className="button ghost" to="/report/found">Report found item</Link></div><p className="hero-note">Already registered? <Link to="/login">Sign in to your workspace →</Link></p></div><div className="hero-panel"><p>ONE PLATFORM. ONE VERIFIED JOURNEY.</p><strong>Lost report</strong><span>→</span><strong>Claim review</strong><span>→</span><strong>Safe handover</strong><small>Designed around the real campus recovery process.</small></div></section><section className="home-section"><p className="eyebrow">HOW IT WORKS</p><h2>Recovery that is easy to follow.</h2><div className="step-grid">{steps.map(([number,title,text])=><article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}</div></section><section className="home-section soft"><p className="eyebrow">BUILT FOR TRACKBACK</p><h2>Every step has a purpose.</h2><div className="feature-grid">{features.map(([icon,title,text])=><article key={title}><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section><section className="home-cta"><div><p className="eyebrow">READY TO HELP?</p><h2>Something lost? Something found?</h2><p>Start a report and give it a verified path back to its owner.</p></div><div className="actions"><Link className="button" to="/signup">Create an account</Link><Link className="button ghost" to="/about">Learn about TrackBack</Link></div></section></PublicLayout>;
}

function About() {
  const roles = [["Student", "Report items, submit private claims, schedule pickup, and access receipts."], ["Security", "Verify ownership, assign storage, and complete safe handovers."], ["Admin", "Moderate reports, oversee workflows, and access authorized analytics."]];
  return <PublicLayout><section className="about-hero"><p className="eyebrow">ABOUT TRACKBACK</p><h1>A more dependable way to return what matters.</h1><p>TrackBack is a Final Year Project built to make campus lost-property recovery organized, secure, and verifiable.</p></section><section className="about-grid"><article><p className="eyebrow">THE PROBLEM</p><h2>Lost-property processes are often fragmented.</h2><p>Campus belongings can move between students, departments, and security desks without a single reliable way to report, identify, verify, and return them.</p></article><article><p className="eyebrow">OUR OBJECTIVE</p><h2>Make recovery clear from report to return.</h2><p>TrackBack connects each stage of recovery while protecting private ownership information and preserving the accountability needed for secure handover.</p></article></section><section className="home-section"><p className="eyebrow">HOW THE PLATFORM HELPS</p><h2>One verified recovery path.</h2><div className="step-grid about-steps"><article><b>01</b><h3>Report</h3><p>Lost and found reports collect consistent information for campus review.</p></article><article><b>02</b><h3>Match</h3><p>Relevant reports can be compared using deterministic matching support.</p></article><article><b>03</b><h3>Verify</h3><p>Authorized staff review private ownership claims before approval.</p></article><article><b>04</b><h3>Hand over</h3><p>Storage, pickup, QR verification, and receipts complete the process safely.</p></article></div></section><section className="home-section soft"><p className="eyebrow">USER ROLES</p><h2>Clear responsibility at every step.</h2><div className="role-grid">{roles.map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section></PublicLayout>;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const home =
    user.role === "admin"
      ? "/admin"
      : user.role === "security"
        ? "/security"
        : "/dashboard";
  const links =
    user.role === "admin"
      ? [
          ["/admin", "Overview"],
          ["/analytics", "Analytics"],
          ["/moderation", "Moderation"],
          ["/claims", "Claims"],
          ["/handover", "Handover"],
        ]
      : user.role === "security"
        ? [
            ["/security", "Operations"],
            ["/claims", "Claims"],
            ["/handover", "Handover"],
          ]
        : [
            ["/dashboard", "Dashboard"],
            ["/items", "Browse"],
            ["/report/lost", "Report lost"],
            ["/report/found", "Report found"],
            ["/claims", "My claims"],
            ["/feedback", "Feedback"],
          ];
  return (
    <div className="app">
      <header>
        <Link className="brand" to={home}>
          <b>↩</b>
          <span>
            TrackBack<small>Campus recovery</small>
          </span>
        </Link>
        <button
          className="menu"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
        <nav className={open ? "open" : ""}>
          {links.map(([to, t]) => (
            <NavLink
              key={to}
              to={to}
              end={to === home}
              onClick={() => setOpen(false)}
            >
              {t}
            </NavLink>
          ))}
          <Notifications />
          <span className="avatar">{user.name?.[0]}</span>
          <Button variant="ghost" onClick={logout}>
            Log out
          </Button>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <div className="brand">
          <b>↩</b>
          <span>
            TrackBack<small>Verified campus recovery</small>
          </span>
        </div>
        <p>Lost property recovery, made safer and simpler.</p>
        <small>© {new Date().getFullYear()} TrackBack</small>
      </footer>
    </div>
  );
}
function Guard({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="loading">Loading TrackBack…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function AuthPage({ signup = false }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    identifier: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (signup) await register(form);
      else await login(form);
      nav("/dashboard");
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth">
      <aside>
        <Link className="brand white" to="/">
          <b>↩</b>
          <span>
            TrackBack<small>Campus recovery</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">VERIFIED RECOVERY</p>
          <h1>
            Bring lost things <i>back</i> to their people.
          </h1>
          <p>Report, verify, and hand over campus property with confidence.</p>
        </div>
        <small>Secure reports · Verified claims · Safe handover</small>
      </aside>
      <section>
        <form onSubmit={submit}>
          <p className="eyebrow">
            {signup ? "CREATE ACCOUNT" : "WELCOME BACK"}
          </p>
          <h2>{signup ? "Join TrackBack" : "Sign in to TrackBack"}</h2>
          <p className="muted">
            {signup
              ? "Start your secure recovery journey."
              : "Use your account to continue."}
          </p>
          <Alert message={error} />
          {signup && (
            <Field
              label="Full name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          )}
          <Field
            label="Email address"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
          {signup && (
            <Field
              label="Student / employee ID"
              value={form.identifier}
              onChange={(e) => set("identifier", e.target.value)}
            />
          )}
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
          <Button disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
          </Button>
          <p className="switch">
            {signup ? "Already registered?" : "New here?"}{" "}
            <Link to={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
function Hero({ eyebrow, title, text, children, className = "" }) {
  return (
    <div className={`page ${className}`}>
      <div className="hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
function ItemGrid({ items, emptyText = "No reports are available yet.", emptyAction }) {
  return items.length ? (
    <div className="grid">
      {items.map((i) => (
        <Link className="item" key={i._id} to={`/items/${i._id}`}>
          <div className="photo">
            {i.images?.[0] ? (
              <img src={api.asset(i.images[0])} alt={i.title} />
            ) : (
              <span>{i.type === "lost" ? "⌕" : "⌁"}</span>
            )}
            <Status value={i.status} />
          </div>
          <div>
            <div className="item-labels">
              <small>{i.type} report</small>
              <small>{i.category}</small>
            </div>
            <h3>{i.title}</h3>
            <p>{i.location}</p>
            {(i.colour || i.brand) && (
              <p className="item-meta">
                {[i.colour, i.brand].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="item-footer">
              <time>{new Date(i.date).toLocaleDateString()}</time>
              <span className="item-action">View details →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <Empty text={emptyText} action={emptyAction} />
  );
}
function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState(location.state?.notice || "");
  const [items, setItems] = useState([]);
  const [ownReports, setOwnReports] = useState([]);
  const [claims, setClaims] = useState([]);
  useEffect(() => {
    if (location.state?.notice) {
      navigate("/dashboard", { replace: true, state: null });
    }
  }, [location.state, navigate]);
  useEffect(() => {
    Promise.all([
      api.get("/items?status=approved&limit=8"),
      api.get("/claims"),
      api.get("/items?limit=50"),
    ]).then(
      ([approvedItems, claimData, visibleReports]) => {
        setItems(approvedItems.items || []);
        setClaims(claimData.claims || []);
        setOwnReports(visibleReports.items || []);
      },
    );
  }, []);
  return (
    <Hero
      eyebrow="STUDENT WORKSPACE"
      title={`Welcome back, ${user.name?.split(" ")[0]}.`}
      text="Your campus recovery journey, in one place."
      className="dashboard-page"
    >
      <Alert message={notice} />
      <div className="actions">
        <Link className="button" to="/report/lost">
          Report lost item
        </Link>
        <Link className="button secondary" to="/report/found">
          Report found item
        </Link>
        <Link className="button ghost" to="/items">
          Browse items
        </Link>
      </div>
      <div className="stats">
        <div>
          <small>MY REPORTS</small>
          <strong>
            {ownReports.filter((i) => i.reportedBy === user.id).length}
          </strong>
          <p>Keep track of submitted reports</p>
        </div>
        <div>
          <small>ACTIVE CLAIMS</small>
          <strong>
            {
              claims.filter((c) => ["requested", "approved"].includes(c.status))
                .length
            }
          </strong>
          <p>Verification and pickup progress</p>
        </div>
        <div>
          <small>CAMPUS ITEMS</small>
          <strong>{items.length}</strong>
          <p>Recently approved reports</p>
        </div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Recent reports</h2>
          <Link to="/items">Browse all →</Link>
        </div>
        <ItemGrid items={items} />
      </section>
    </Hero>
  );
}
function Items() {
  const [data, setData] = useState({ items: [], pagination: null });
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    category: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestItems = async (nextFilters = filters, nextPage = page) => {
    const params = new URLSearchParams({ limit: "12", page: String(nextPage) });
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value.trim()) params.set(key, value.trim());
    });
    try {
      setLoading(true);
      setError("");
      const result = await api.get(`/items?${params.toString()}`);
      setData(result);
      setPage(nextPage);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    async function loadInitialItems() {
      try {
        const result = await api.get("/items?limit=12&page=1");
        if (active) setData(result);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInitialItems();
    return () => {
      active = false;
    };
  }, []);
  const applyFilters = (event) => {
    event.preventDefault();
    requestItems(filters, 1);
  };
  const clearFilters = () => {
    const emptyFilters = { search: "", type: "", category: "", status: "" };
    setFilters(emptyFilters);
    requestItems(emptyFilters, 1);
  };
  const hasFilters = Object.values(filters).some((value) => value);
  return (
    <Hero
      eyebrow="CAMPUS BROWSE"
      title="Find what made its way back."
      text="Search available campus reports by type, category, or current status."
    >
      <form className="browse-filters" onSubmit={applyFilters}>
        <label className="filter-search">
          <span>Search reports</span>
          <input
            placeholder="Item, brand, colour, or location"
            value={filters.search}
            onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
          />
        </label>
        <label>
          <span>Report type</span>
          <select
            value={filters.type}
            onChange={(e) => setFilters((current) => ({ ...current, type: e.target.value }))}
          >
            <option value="">All reports</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select
            value={filters.category}
            onChange={(e) => setFilters((current) => ({ ...current, category: e.target.value }))}
          >
            <option value="">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
          >
            <option value="">All visible statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="claim_requested">Claim requested</option>
            <option value="claim_approved">Claim approved</option>
            <option value="claimed">Claimed</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
            <option value="unclaimed">Unclaimed</option>
          </select>
        </label>
        <div className="filter-actions">
          <Button disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
          {hasFilters && <Button type="button" variant="ghost" onClick={clearFilters}>Clear filters</Button>}
        </div>
      </form>
      <Alert message={error} />
      {error && (
        <Button variant="ghost" onClick={() => requestItems()}>
          Try again
        </Button>
      )}
      {loading ? (
        <div className="items-loading" role="status">Loading items…</div>
      ) : (
        <>
          <div className="browse-summary">
            <p>{data.pagination?.total ?? data.items.length} item{(data.pagination?.total ?? data.items.length) === 1 ? "" : "s"} found</p>
            {data.pagination?.totalPages > 1 && <p>Page {data.pagination.page} of {data.pagination.totalPages}</p>}
          </div>
          <ItemGrid
            items={data.items}
            emptyText={hasFilters ? "No items match these filters. Clear the filters or try a broader search." : "No approved reports are available yet."}
            emptyAction={hasFilters ? <Button variant="ghost" onClick={clearFilters}>Clear filters</Button> : undefined}
          />
          {data.pagination?.totalPages > 1 && (
            <nav className="pagination" aria-label="Item pages">
              <Button variant="ghost" disabled={page <= 1 || loading} onClick={() => requestItems(filters, page - 1)}>Previous</Button>
              <span>Page {page} of {data.pagination.totalPages}</span>
              <Button disabled={page >= data.pagination.totalPages || loading} onClick={() => requestItems(filters, page + 1)}>Next</Button>
            </nav>
          )}
        </>
      )}
    </Hero>
  );
}
function Report({ type }) {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "electronics",
    location: "",
    date: "",
    colour: "",
    brand: "",
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries({ ...form, type }).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("images", f));
      await api.post("/items", fd, true);
      nav("/dashboard");
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  };
  const set = (k, v) => setForm({ ...form, [k]: v });
  return (
    <Hero
      eyebrow={`${type.toUpperCase()} REPORT`}
      title={`Report a ${type} item.`}
      text="Clear details give your report the best chance of being recovered."
    >
      <form className="form" onSubmit={submit}>
        <Alert message={error} />
        <div className="form-grid">
          <Field
            label="Item title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Location"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />
          <Field label="Date and time">
            <input
              required
              type="datetime-local"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </Field>
          <Field
            label="Colour"
            required={false}
            value={form.colour}
            onChange={(e) => set("colour", e.target.value)}
          />
          <Field
            label="Brand"
            required={false}
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
          />
        </div>
        <Field label="Description">
          <textarea
            required
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Photos">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setFiles([...e.target.files])}
          />
        </Field>
        <Button disabled={busy}>
          {busy ? "Submitting…" : `Submit ${type} report`}
        </Button>
      </form>
    </Hero>
  );
}
function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [proof, setProof] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    async function loadItem() {
      try {
        const result = await api.get(`/items/${id}`);
        if (active) {
          setItem(result.item);
          setActiveImage(0);
          setError("");
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    loadItem();
    return () => {
      active = false;
    };
  }, [id, reloadKey]);
  const claim = async () => {
    if (submittingClaim) return;
    try {
      setSubmittingClaim(true);
      setError("");
      await api.post("/claims", {
        itemId: id,
        ownershipProof: { description: proof },
      });
      window.dispatchEvent(new Event("trackback:notifications-changed"));
      navigate("/dashboard", {
        replace: true,
        state: {
          notice: "Claim submitted successfully. It is now awaiting verification.",
        },
      });
    } catch (e) {
      setError(e.message);
      setSubmittingClaim(false);
    }
  };
  if (error && !item)
    return (
      <Hero
        eyebrow="ITEM DETAILS"
        title="We could not load this report."
        text={error}
      >
        <Link className="button" to="/items">
          Return to browse
        </Link>
        <Button variant="ghost" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>
      </Hero>
    );
  if (!item)
    return <Hero eyebrow="ITEM DETAILS" title="Loading report…" text="" />;
  const images = item.images || [];
  const claimable = user.role === "student" && item.status === "approved";
  const claimUnavailableMessage = item.status === "pending"
    ? "Claim unavailable — this report is awaiting verification by TrackBack staff."
    : "This report is not currently available for a new claim.";
  return (
    <Hero
      eyebrow={`${item.type.toUpperCase()} REPORT`}
      title={item.title}
      text={`${item.category} · ${item.location}`}
    >
      <div className="detail">
        <div className="gallery">
          {images.length ? (
            <>
              <img src={api.asset(images[activeImage])} alt={`${item.title} image ${activeImage + 1}`} />
              {images.length > 1 && (
                <div className="gallery-thumbnails" aria-label="Item images">
                  {images.map((image, index) => (
                    <button
                      className={index === activeImage ? "active" : ""}
                      key={image}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img src={api.asset(image)} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="photo large"><span>⌁</span><small>No image provided</small></div>
          )}
        </div>
        <article>
          <Status value={item.status} />
          <h2>Item details</h2>
          <p>{item.description}</p>
          <dl>
            <dt>Report type</dt>
            <dd>{label(item.type)} report</dd>
            <dt>Category</dt>
            <dd>{item.category}</dd>
            <dt>Reported location</dt>
            <dd>{item.location}</dd>
            <dt>Date</dt>
            <dd>{new Date(item.date).toLocaleString()}</dd>
            {item.colour && (
              <>
                <dt>Colour</dt>
                <dd>{item.colour}</dd>
              </>
            )}
            {item.brand && (
              <>
                <dt>Brand</dt>
                <dd>{item.brand}</dd>
              </>
            )}
          </dl>
          {claimable && (
            <div className="claim-box">
              <h3>Claim this item</h3>
              <p>Your ownership proof is private and only visible to authorized verification staff.</p>
              <label htmlFor="ownership-proof">Why do you believe this item belongs to you?</label>
              <textarea
                id="ownership-proof"
                placeholder="Describe a private identifying detail…"
                value={proof}
                onChange={(e) => setProof(e.target.value)}
              />
              <Button
                disabled={submittingClaim || proof.trim().length < 10}
                onClick={claim}
              >
                {submittingClaim ? "Submitting claim…" : "Submit claim"}
              </Button>
            </div>
          )}
          {user.role === "student" && !claimable && (
            <div className="claim-unavailable">
              <strong>Claim unavailable</strong>
              <p>{claimUnavailableMessage}</p>
            </div>
          )}
        </article>
      </div>
      <Alert message={error} />
    </Hero>
  );
}
function Claims() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState({});
  const [qrs, setQrs] = useState({});
  const load = () =>
    api
      .get("/claims")
      .then((x) => setClaims(x.claims || []))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const savePickup = async (claim) => {
    const value = schedule[claim._id] || {};
    try {
      await api.patch(`/handover/claims/${claim._id}/pickup`, {
        pickupDate: value.date,
        pickupSlot: value.slot,
      });
      setError(
        "Pickup appointment saved. You can now create your handover QR.",
      );
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  const createQr = async (id) => {
    try {
      const data = await api.post(`/handover/claims/${id}/qr`, {});
      setQrs({ ...qrs, [id]: data });
    } catch (e) {
      setError(e.message);
    }
  };
  const receipt = async (id) => {
    try {
      await api.download(
        `/handover/claims/${id}/receipt`,
        `trackback-receipt-${id}.pdf`,
      );
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Hero
      eyebrow={user.role === "student" ? "MY CLAIMS" : "CLAIM OPERATIONS"}
      title={
        user.role === "student"
          ? "Follow your recovery progress."
          : "Review claims requiring action."
      }
      text="Status updates and secure pickup details appear here."
    >
      <Alert message={error} />
      {claims.length ? (
        <div className="claims-list">
          {claims.map((c) => (
            <article className="claim-card" key={c._id}>
              <div className="claim-head">
                <div>
                  <b>Claim #{c._id?.slice(-6)}</b>
                  <small>
                    Item reference {(c.item?._id || c.item)?.slice?.(-6)}
                  </small>
                </div>
                <Status value={c.status} />
              </div>
              {c.pickupDate && (
                <p className="muted">
                  Pickup: {new Date(c.pickupDate).toLocaleDateString()} ·{" "}
                  {c.pickupSlot}
                </p>
              )}
              {c.status === "completed" && (
                <div className="qr-action">
                  <Button variant="secondary" onClick={() => receipt(c._id)}>
                    Download handover receipt
                  </Button>
                </div>
              )}
              {user.role === "student" &&
                c.status === "approved" &&
                !c.pickupDate && (
                  <div className="pickup-form">
                    <Field label="Pickup date">
                      <input
                        type="date"
                        value={schedule[c._id]?.date || ""}
                        onChange={(e) =>
                          setSchedule({
                            ...schedule,
                            [c._id]: {
                              ...schedule[c._id],
                              date: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="Time slot">
                      <select
                        value={schedule[c._id]?.slot || ""}
                        onChange={(e) =>
                          setSchedule({
                            ...schedule,
                            [c._id]: {
                              ...schedule[c._id],
                              slot: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Choose a slot</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                      </select>
                    </Field>
                    <Button onClick={() => savePickup(c)}>
                      Schedule pickup
                    </Button>
                  </div>
                )}
              {user.role === "student" &&
                c.status === "approved" &&
                c.pickupDate && (
                  <div className="qr-action">
                    <Button onClick={() => createQr(c._id)}>
                      Generate one-time QR
                    </Button>
                    {qrs[c._id]?.qrDataUrl && (
                      <div>
                        <img
                          className="qr"
                          src={qrs[c._id].qrDataUrl}
                          alt="One-time handover QR code"
                        />
                        <small>
                          Expires{" "}
                          {new Date(qrs[c._id].expiresAt).toLocaleString()}.
                          Present this at handover.
                        </small>
                      </div>
                    )}
                  </div>
                )}
            </article>
          ))}
        </div>
      ) : (
        <Empty text="Claims will appear once you submit or receive one." />
      )}
    </Hero>
  );
}
function Operations({ admin = false }) {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notice, setNotice] = useState(() => location.state?.notice || "");
  const [storage, setStorage] = useState({});
  const [storageMessages, setStorageMessages] = useState({});
  const [editingStorage, setEditingStorage] = useState({});
  const [savingStorage, setSavingStorage] = useState({});
  const [reasons, setReasons] = useState({});
  const load = () =>
    Promise.all([api.get("/items?status=pending&limit=20"), api.get("/claims")])
      .then(([i, c]) => {
        setItems(i.items || []);
        setClaims(c.claims || []);
      })
      .catch((e) => setNotice(e.message));
  useEffect(() => {
    load();
  }, []);
  const moderate = async (id, action) => {
    try {
      await api.patch(
        `/items/${id}/${action}`,
        action === "reject"
          ? { rejectionReason: "Does not meet reporting requirements." }
          : {},
      );
      setNotice(`Report ${action}d.`);
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };
  const verify = async (id, action) => {
    try {
      if (action === "reject") {
        const rejectionReason = reasons[id] || "";
        if (rejectionReason.trim().length < 5) {
          setNotice("Enter a rejection reason of at least five characters.");
          return;
        }
        await api.patch(`/claims/${id}/reject`, { rejectionReason });
        setNotice("Claim rejected and the item returned to approved status.");
        load();
        return;
      }
      await api.patch(`/claims/${id}/approve`, {
        verificationNotes: "Reviewed in TrackBack operations workspace.",
      });
      setNotice("Claim approved for secure pickup.");
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };
  const assignStorage = async (claim) => {
    const itemId = claim.item?._id || claim.item;
    const existingLocation = claim.item?.storageLocation?.trim() || "";
    const storageLocation = (storage[claim._id] ?? existingLocation).trim();
    if (storageLocation.length < 3) {
      setStorageMessages((current) => ({
        ...current,
        [claim._id]: "Enter a storage location of at least three characters.",
      }));
      return;
    }
    try {
      setSavingStorage((current) => ({ ...current, [claim._id]: true }));
      setStorageMessages((current) => ({ ...current, [claim._id]: "" }));
      const result = await api.patch(`/items/${itemId}/storage`, {
        storageLocation,
      });
      setClaims((current) =>
        current.map((currentClaim) =>
          currentClaim._id === claim._id
            ? {
                ...currentClaim,
                item: {
                  ...(typeof currentClaim.item === "object"
                    ? currentClaim.item
                    : {}),
                  ...result.item,
                },
              }
            : currentClaim,
        ),
      );
      setStorage((current) => ({
        ...current,
        [claim._id]: result.item.storageLocation || storageLocation,
      }));
      setEditingStorage((current) => ({ ...current, [claim._id]: false }));
      setStorageMessages((current) => ({
        ...current,
        [claim._id]: existingLocation
          ? "Storage location updated successfully."
          : "Storage assigned successfully.",
      }));
    } catch (e) {
      setStorageMessages((current) => ({ ...current, [claim._id]: e.message }));
    } finally {
      setSavingStorage((current) => ({ ...current, [claim._id]: false }));
    }
  };
  return (
    <Hero
      eyebrow={admin ? "ADMIN CONSOLE" : "SECURITY OPERATIONS"}
      title={admin ? "Moderate with clarity." : "Secure every handover."}
      text={
        admin
          ? "Review incoming reports and platform workflows."
          : "Verify claims, assign storage, and complete safe pickup."
      }
    >
      <Alert message={notice} />
      <div className="stats">
        <div>
          <small>PENDING REPORTS</small>
          <strong>{items.length}</strong>
          <p>Awaiting moderation</p>
        </div>
        <div>
          <small>OPEN CLAIMS</small>
          <strong>
            {claims.filter((c) => c.status === "requested").length}
          </strong>
          <p>Ready for review</p>
        </div>
        <div>
          <small>HANDOVER</small>
          <strong>↗</strong>
          <p>Use secure verification flow</p>
        </div>
      </div>
      {admin && (
        <section className="section">
          <div className="section-head">
            <h2>Moderation queue</h2>
          </div>
          {items.length ? (
            <div className="table">
              {items.map((i) => (
                <div key={i._id}>
                  <div>
                    <b>{i.title}</b>
                    <small>
                      {i.type} · {i.category}
                    </small>
                  </div>
                  <Status value={i.status} />
                  <div className="inline">
                    <Button onClick={() => moderate(i._id, "approve")}>
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => moderate(i._id, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No reports are waiting for moderation." />
          )}
        </section>
      )}
      <section className="section">
        <div className="section-head">
          <h2>Claim verification</h2>
        </div>
        {claims.filter((c) => ["requested", "approved"].includes(c.status))
          .length ? (
          <div className="claims-list">
            {claims
              .filter((c) => ["requested", "approved"].includes(c.status))
              .map((c) => (
                <article className="claim-card" key={c._id}>
                  <div className="claim-head">
                    <b>Claim #{c._id.slice(-6)}</b>
                    <Status value={c.status} />
                  </div>
                  {c.status === "requested" && (
                    <>
                      <Field label="Rejection reason" required={false}>
                        <input
                          placeholder="Required only if rejecting"
                          value={reasons[c._id] || ""}
                          onChange={(e) =>
                            setReasons({ ...reasons, [c._id]: e.target.value })
                          }
                        />
                      </Field>
                      <div className="inline">
                        <Button onClick={() => verify(c._id, "approve")}>
                          Approve ownership proof
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => verify(c._id, "reject")}
                        >
                          Reject claim
                        </Button>
                      </div>
                    </>
                  )}
                  {c.status === "approved" && (
                    (() => {
                      const assignedLocation = c.item?.storageLocation?.trim() || "";
                      const isEditing = Boolean(editingStorage[c._id]);
                      const saving = Boolean(savingStorage[c._id]);
                      return (
                        <section
                          className={`storage-assignment ${assignedLocation ? "assigned" : "unassigned"}`}
                        >
                          <div className="storage-assignment-head">
                            <div>
                              <strong>
                                {assignedLocation
                                  ? "Storage Assigned"
                                  : "Storage not assigned"}
                              </strong>
                              {assignedLocation && !isEditing && (
                                <p>Location: {assignedLocation}</p>
                              )}
                            </div>
                            {assignedLocation && !isEditing && (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setStorage((current) => ({
                                    ...current,
                                    [c._id]: assignedLocation,
                                  }));
                                  setEditingStorage((current) => ({
                                    ...current,
                                    [c._id]: true,
                                  }));
                                  setStorageMessages((current) => ({
                                    ...current,
                                    [c._id]: "",
                                  }));
                                }}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                          {(!assignedLocation || isEditing) && (
                            <div className="storage-assignment-form">
                              <Field label="Storage location">
                                <input
                                  placeholder="e.g. Security Office Locker 4"
                                  value={storage[c._id] ?? assignedLocation}
                                  onChange={(e) =>
                                    setStorage((current) => ({
                                      ...current,
                                      [c._id]: e.target.value,
                                    }))
                                  }
                                />
                              </Field>
                              <div className="inline">
                                <Button
                                  disabled={saving}
                                  onClick={() => assignStorage(c)}
                                >
                                  {saving
                                    ? "Saving…"
                                    : assignedLocation
                                      ? "Save location"
                                      : "Assign storage"}
                                </Button>
                                {assignedLocation && (
                                  <Button
                                    variant="ghost"
                                    disabled={saving}
                                    onClick={() => {
                                      setStorage((current) => ({
                                        ...current,
                                        [c._id]: assignedLocation,
                                      }));
                                      setEditingStorage((current) => ({
                                        ...current,
                                        [c._id]: false,
                                      }));
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          <Alert message={storageMessages[c._id]} />
                        </section>
                      );
                    })()
                  )}
                </article>
              ))}
          </div>
        ) : (
          <Empty text="No claims currently need a verification or storage action." />
        )}
      </section>
      <section className="section">
        <Link className="button" to="/handover">
          Open handover workspace
        </Link>
      </section>
    </Hero>
  );
}
function Handover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState(() => searchParams.get("token") || "");
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      setMessage("");
      await api.post("/handover/verify", {
        token: token.trim(),
        collegeIdVerified: verified,
      });
      navigate(user.role === "admin" ? "/admin" : "/security", {
        replace: true,
        state: { notice: "Handover completed successfully." },
      });
    } catch (x) {
      setMessage(
        /invalid|expired|used|eligible/i.test(x.message)
          ? "Invalid, expired, or already-used QR token. Please try again."
          : x.message,
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Hero
      eyebrow="SECURE HANDOVER"
      title="Verify before you release."
      text="Only complete handover after the claimant’s college ID has been checked."
    >
      <form className="form handover" onSubmit={submit}>
        <Alert message={message} />
        <Field label="QR token">
          <input
            required
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              if (message) setMessage("");
            }}
            placeholder="Scan QR link or paste the complete one-time token"
          />
        </Field>
        <p className="handover-help">
          Scanning a TrackBack QR opens this page with its secure token already filled in. The short claim reference is not a QR token.
        </p>
        <label className="check">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />{" "}
          I have manually verified the claimant’s college ID.
        </label>
        <div className="inline handover-actions">
          <Button disabled={!verified || !token.trim() || submitting}>
            {submitting ? "Verifying handover…" : "Complete secure handover"}
          </Button>
          {(token || message) && (
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={() => {
                setToken("");
                setMessage("");
                setSearchParams({});
              }}
            >
              Clear and try another
            </Button>
          )}
        </div>
      </form>
    </Hero>
  );
}
function Feedback() {
  const [claims, setClaims] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [form, setForm] = useState({ claimId: "", rating: 5, feedback: "" });
  const [message, setMessage] = useState("");
  const load = () =>
    Promise.all([api.get("/claims"), api.get("/ratings")])
      .then(([c, r]) => {
        setClaims(c.claims || []);
        setRatings(r.ratings || []);
      })
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/ratings", { ...form, rating: Number(form.rating) });
      setMessage("Thank you for your feedback.");
      load();
    } catch (x) {
      setMessage(x.message);
    }
  };
  const eligible = claims.filter(
    (c) =>
      c.status === "completed" &&
      !ratings.some((r) => r.claim === c._id || r.claim?._id === c._id),
  );
  return (
    <Hero
      eyebrow="HANDOVER FEEDBACK"
      title="How was your recovery experience?"
      text="Feedback is available only after your secure handover is complete."
    >
      <Alert message={message} />
      {eligible.length ? (
        <form className="form" onSubmit={submit}>
          <Field label="Completed handover">
            <select
              required
              value={form.claimId}
              onChange={(e) => setForm({ ...form, claimId: e.target.value })}
            >
              <option value="">Choose a handover</option>
              {eligible.map((c) => (
                <option key={c._id} value={c._id}>
                  Claim #{c._id.slice(-6)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rating">
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </Field>
          <Field label="Optional feedback" required={false}>
            <textarea
              value={form.feedback}
              onChange={(e) => setForm({ ...form, feedback: e.target.value })}
            />
          </Field>
          <Button>Submit feedback</Button>
        </form>
      ) : (
        <Empty text="Complete a handover to share feedback. Submitted ratings are kept on record." />
      )}
    </Hero>
  );
}
function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/admin/analytics")
      .then((x) => setData(x.analytics))
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <Hero
        eyebrow="ADMIN ANALYTICS"
        title="Analytics unavailable."
        text={error}
      />
    );
  if (!data)
    return (
      <Hero eyebrow="ADMIN ANALYTICS" title="Loading live metrics…" text="" />
    );
  const itemRows = Object.entries(data.itemStatus).map(([name, value]) => ({
    name,
    value,
  }));
  const claimRows = Object.entries(data.claimStatus).map(([name, value]) => ({
    name,
    value,
  }));
  return (
    <Hero
      eyebrow="ADMIN ANALYTICS"
      title="Live recovery insights."
      text="Metrics are calculated directly from TrackBack records."
    >
      <div className="stats">
        <div>
          <small>LOST REPORTS</small>
          <strong>{data.itemTypes.lost || 0}</strong>
          <p>All lost reports</p>
        </div>
        <div>
          <small>FOUND REPORTS</small>
          <strong>{data.itemTypes.found || 0}</strong>
          <p>All found reports</p>
        </div>
        <div>
          <small>COMPLETED HANDOVERS</small>
          <strong>{data.claimStatus.completed || 0}</strong>
          <p>Verified recoveries</p>
        </div>
      </div>
      <div className="chart-grid">
        <section className="chart-card">
          <h2>Item statuses</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={itemRows}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0b6e69" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="chart-card">
          <h2>Claim statuses</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={claimRows}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#17324d" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
      <section className="section">
        <Button
          onClick={() =>
            api.download("/admin/export.csv", "trackback-admin-export.csv")
          }
        >
          Export safe CSV
        </Button>
      </section>
    </Hero>
  );
}
function NotFound() {
  return (
    <Hero
      eyebrow="NOT FOUND"
      title="This page has moved."
      text="Return to your TrackBack workspace."
    >
      <Link className="button" to="/dashboard">
        Go to dashboard
      </Link>
    </Hero>
  );
}
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage signup />} />
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/dashboard"
            element={
              <Guard>
                <Dashboard />
              </Guard>
            }
          />
          <Route
            path="/items"
            element={
              <Guard>
                <Items />
              </Guard>
            }
          />
          <Route
            path="/items/:id"
            element={
              <Guard>
                <Detail />
              </Guard>
            }
          />
          <Route
            path="/report/lost"
            element={
              <Guard>
                <Report type="lost" />
              </Guard>
            }
          />
          <Route
            path="/report/found"
            element={
              <Guard>
                <Report type="found" />
              </Guard>
            }
          />
          <Route
            path="/claims"
            element={
              <Guard>
                <Claims />
              </Guard>
            }
          />
          <Route
            path="/feedback"
            element={
              <Guard roles={["student"]}>
                <Feedback />
              </Guard>
            }
          />
          <Route
            path="/security"
            element={
              <Guard roles={["security", "admin"]}>
                <Operations />
              </Guard>
            }
          />
          <Route
            path="/admin"
            element={
              <Guard roles={["admin"]}>
                <Operations admin />
              </Guard>
            }
          />
          <Route
            path="/analytics"
            element={
              <Guard roles={["admin"]}>
                <Analytics />
              </Guard>
            }
          />
          <Route
            path="/moderation"
            element={
              <Guard roles={["admin"]}>
                <Operations admin />
              </Guard>
            }
          />
          <Route
            path="/handover"
            element={
              <Guard roles={["security", "admin"]}>
                <Handover />
              </Guard>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
