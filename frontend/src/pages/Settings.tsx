import { useReducer, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/hooks/useAuditLog";
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from "@/hooks/useCategories";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { APP_VERSION } from "@/lib/version";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  User,
  SlidersHorizontal,
  Tag,
  AlertTriangle,
  Command,
} from "lucide-react";

import {
  ProfilePasswordCard,
  type ProfileState,
  type ProfileAction,
  type PwState,
  type PwAction,
} from "@/components/ar/settings/ProfilePasswordCard";
import { PreferencesCard } from "@/components/ar/settings/PreferencesCard";
import {
  CategorySection,
  type CatState,
  type CatAction,
  type CategoryFormState,
} from "@/components/ar/settings/CategorySection";
import { DangerZone, type DelState, type DelAction } from "@/components/ar/settings/DangerZone";

function toKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

const emptyForm: CategoryFormState = { label: "", short: "" };

const catInit: CatState = {
  dialogOpen: false,
  editingKey: null,
  form: emptyForm,
  formError: "",
  deleteTarget: null,
  dragging: null,
  dragOver: null,
};

function catReducer(s: CatState, a: CatAction): CatState {
  switch (a.type) {
    case "open_add": return { ...s, dialogOpen: true, editingKey: null, form: emptyForm, formError: "" };
    case "open_edit": return { ...s, dialogOpen: true, editingKey: a.cat.key, form: { label: a.cat.label, short: a.cat.short }, formError: "" };
    case "set_form": return { ...s, form: { ...s.form, ...a.patch } };
    case "set_error": return { ...s, formError: a.msg };
    case "close_dialog": return { ...s, dialogOpen: false };
    case "set_delete_target": return { ...s, deleteTarget: a.cat };
    case "drag_start": return { ...s, dragging: a.key };
    case "drag_over": return { ...s, dragOver: a.key };
    case "drag_end": return { ...s, dragging: null, dragOver: null };
    default: return s;
  }
}

const pwInit: PwState = { open: false, next: "", confirm: "", loading: false, error: "", showPassword: false };

function pwReducer(s: PwState, a: PwAction): PwState {
  switch (a.type) {
    case "open": return { ...s, open: true };
    case "close": return { ...pwInit };
    case "set": return { ...s, ...a.patch, error: "" };
    case "toggle_show": return { ...s, showPassword: !s.showPassword };
    case "submitting": return { ...s, loading: true, error: "" };
    case "done": return { ...s, loading: false, error: a.error ?? "", ...(a.error ? {} : { open: false, next: "", confirm: "", showPassword: false }) };
    default: return s;
  }
}

const delInit: DelState = { open: false, confirmText: "", password: "", loading: false };

function delReducer(s: DelState, a: DelAction): DelState {
  switch (a.type) {
    case "open": return { ...delInit, open: true };
    case "close": return { ...delInit };
    case "set_text": return { ...s, confirmText: a.text };
    case "set_pw": return { ...s, password: a.pw };
    case "submitting": return { ...s, loading: true };
    case "done": return { ...delInit };
    default: return s;
  }
}

const profileInit: ProfileState = { open: false, first_name: "", last_name: "", loading: false };

function profileReducer(s: ProfileState, a: ProfileAction): ProfileState {
  switch (a.type) {
    case "open": return { open: true, first_name: a.first_name, last_name: a.last_name, loading: false };
    case "close": return { ...profileInit };
    case "set": return { ...s, ...a.patch };
    case "submitting": return { ...s, loading: true };
    case "done": return { ...profileInit };
    default: return s;
  }
}

type SettingsTab = "profile" | "preferences" | "categories" | "danger";

interface TabItem {
  id: SettingsTab;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  destructive?: boolean;
}

const SETTINGS_TABS: TabItem[] = [
  { id: "profile", label: "Profile & Security", sublabel: "Identity & access keys", icon: User },
  { id: "preferences", label: "Preferences & Region", sublabel: "Theme, haptics & timezone", icon: SlidersHorizontal },
  { id: "categories", label: "Document Categories", sublabel: "Keys & custom order", icon: Tag },
  { id: "danger", label: "Danger Zone", sublabel: "Account & data purge", icon: AlertTriangle, destructive: true },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as SettingsTab) || "profile";

  const setActiveTab = (tab: SettingsTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: categories = [], isLoading } = useCategories();
  const { data: logs = [] } = useDailyLogs();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();

  const [cat, catDispatch] = useReducer(catReducer, catInit);
  const [pwState, pwDispatch] = useReducer(pwReducer, pwInit);
  const [delState, delDispatch] = useReducer(delReducer, delInit);
  const [profileState, profileDispatch] = useReducer(profileReducer, profileInit);

  function handleSave() {
    const label = cat.form.label.trim();
    const short = cat.form.short.trim();
    if (!label) { catDispatch({ type: "set_error", msg: "Label is required." }); return; }
    if (!short) { catDispatch({ type: "set_error", msg: "Short name is required." }); return; }
    if (short.length > 10) { catDispatch({ type: "set_error", msg: "Short name must be 10 characters or fewer." }); return; }

    if (cat.editingKey) {
      updateCategory.mutate({ key: cat.editingKey, updates: { label, short } }, {
        onSuccess: () => { toast.success("Category updated."); catDispatch({ type: "close_dialog" }); },
      });
    } else {
      const key = toKey(label);
      if (!key) { catDispatch({ type: "set_error", msg: "Could not derive a key from this label." }); return; }
      if (categories.some((c) => c.key === key)) {
        catDispatch({ type: "set_error", msg: "A category with this name already exists." });
        return;
      }
      addCategory.mutate(
        { key, label, short, position: categories.length },
        { onSuccess: () => { toast.success("Category added."); catDispatch({ type: "close_dialog" }); } },
      );
    }
  }

  function handleDelete() {
    if (!cat.deleteTarget) return;
    deleteCategory.mutate(cat.deleteTarget.key, {
      onSuccess: () => { toast.success(`"${cat.deleteTarget!.label}" removed.`); catDispatch({ type: "set_delete_target", cat: null }); },
    });
  }

  function handleDrop(targetKey: string) {
    if (!cat.dragging || cat.dragging === targetKey) { catDispatch({ type: "drag_end" }); return; }
    const from = categories.findIndex((c) => c.key === cat.dragging);
    const to = categories.findIndex((c) => c.key === targetKey);
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next, {
      onSuccess: () => { toast.success("Category order updated."); }
    });
    catDispatch({ type: "drag_end" });
  }

  function handleMove(key: string, dir: -1 | 1) {
    const from = categories.findIndex((c) => c.key === key);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next, {
      onSuccess: () => { toast.success("Category order updated."); }
    });
  }

  const handleChangePassword = async () => {
    if (!pwState.next) { pwDispatch({ type: "done", error: "New password is required." }); return; }
    if (pwState.next.length < 6) { pwDispatch({ type: "done", error: "Password must be at least 6 characters." }); return; }
    if (pwState.next !== pwState.confirm) { pwDispatch({ type: "done", error: "Passwords do not match." }); return; }
    pwDispatch({ type: "submitting" });
    const { error } = await supabase.auth.updateUser({ password: pwState.next });
    if (error) { pwDispatch({ type: "done", error: error.message }); return; }
    await logAuditEvent("password_changed");
    toast.success("Password updated.");
    pwDispatch({ type: "done" });
  };

  const handleDeleteAccount = async () => {
    if (delState.confirmText !== "DELETE") return;
    if (!delState.password) { toast.error("Password is required to delete your account."); return; }
    delDispatch({ type: "submitting" });
    try {
      const email = user?.email;
      if (!email) throw new Error("Not authenticated");
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: delState.password });
      if (authError) throw new Error("Incorrect password.");
      const { error: deleteError } = await supabase.rpc("delete_own_account");
      if (deleteError) throw deleteError;
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Account and all data deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account.");
      delDispatch({ type: "done" });
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileState.first_name.trim()) { toast.error("First name is required."); return; }
    if (!profileState.last_name.trim()) { toast.error("Last name is required."); return; }
    profileDispatch({ type: "submitting" });
    try {
      await updateProfile.mutateAsync({
        first_name: profileState.first_name.trim(),
        last_name: profileState.last_name.trim(),
      });
      toast.success("Profile updated.");
      profileDispatch({ type: "done" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile.");
      profileDispatch({ type: "done" });
    }
  };

  const isBusy = addCategory.isPending || updateCategory.isPending;

  const [tzPreference, setTzPreference] = useState(() => localStorage.getItem("tz_preference") ?? "org");

  const handleTzChange = (val: string) => {
    setTzPreference(val);
    localStorage.setItem("tz_preference", val);
    toast.success("Time zone preference updated.");
  };

  const userInitials = (() => {
    const f = profile?.first_name?.[0] ?? "";
    const l = profile?.last_name?.[0] ?? "";
    return ((f + l) || user?.email?.[0] || "U").toUpperCase();
  })();

  const userDisplayName = profile?.first_name || profile?.last_name
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Authorized User";

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/50 gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
                Settings &amp; Workspace
              </h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure personal profile, visual environment, document categories, and system region
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/40 border border-border/50 rounded-xl px-3 py-1.5">
            <Command className="size-3.5 text-muted-foreground" />
            <span>Cmd+K for Command Palette</span>
          </div>
        </div>

        {/* ── Two-Column macOS / Apple Settings Layout ── */}
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
          {/* ── Left Navigation Rail ── */}
          <aside className="w-full md:w-64 lg:w-72 shrink-0 space-y-4">
            {/* Quick Profile Summary Card */}
            <div className="p-3.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border/70 shadow-sm flex items-center gap-3">
              <div className="relative size-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold text-sm shadow-inner shrink-0 font-heading">
                {userInitials}
                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate font-heading">{userDisplayName}</p>
                <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">{user?.email || "Signed In"}</p>
                <span className="inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded mt-1">
                  {profile?.role === "admin" ? "Admin" : "AR Specialist"}
                </span>
              </div>
            </div>

            {/* Navigation Tabs (Vertical on Desktop, Horizontal on Mobile) */}
            <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0 p-1.5 rounded-2xl bg-card/90 backdrop-blur-md border border-border/70 shadow-sm">
              {SETTINGS_TABS.map((t) => {
                const active = activeTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "relative shrink-0 md:w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer select-none text-left",
                      active
                        ? "text-white font-semibold"
                        : t.destructive
                        ? "text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="settings-active-pill"
                        className={cn(
                          "absolute inset-0 rounded-xl shadow-xs",
                          t.destructive
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-emerald-600 shadow-emerald-600/25"
                        )}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5 min-w-0">
                      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{t.label}</span>
                    </span>

                    {/* Count badge for categories */}
                    {t.id === "categories" && categories.length > 0 && (
                      <span
                        className={cn(
                          "relative z-10 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ml-2",
                          active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {categories.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Workspace & System Info Card (Desktop) */}
            <div className="hidden md:block p-4 rounded-2xl bg-card/70 border border-border/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">System Status</span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-500 font-mono text-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Build Engine</span>
                <span className="font-mono font-bold text-foreground text-2xs">{APP_VERSION}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Auth Provider</span>
                <span className="font-mono text-muted-foreground text-2xs">Supabase JWT</span>
              </div>
              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                TrackBasata AR Workstation Engine. Real-time document indexing &amp; compliance logs.
              </div>
            </div>
          </aside>

          {/* ── Right Content Canvas ── */}
          <section className="flex-1 min-w-0 w-full space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <ProfilePasswordCard
                    profile={profile}
                    profileState={profileState}
                    pwState={pwState}
                    profileDispatch={profileDispatch}
                    pwDispatch={pwDispatch}
                    onUpdateProfile={handleUpdateProfile}
                    onChangePassword={handleChangePassword}
                    email={user?.email}
                    createdAt={user?.created_at}
                    categoriesCount={categories.length}
                    logsCount={logs.length}
                  />
                </motion.div>
              )}

              {activeTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <PreferencesCard
                    tzPreference={tzPreference}
                    onTzChange={handleTzChange}
                  />
                </motion.div>
              )}

              {activeTab === "categories" && (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <CategorySection
                    categories={categories}
                    isLoading={isLoading}
                    cat={cat}
                    catDispatch={catDispatch}
                    isBusy={isBusy}
                    onAdd={() => catDispatch({ type: "open_add" })}
                    onEdit={(c) => catDispatch({ type: "open_edit", cat: c })}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onDragStart={(key) => catDispatch({ type: "drag_start", key })}
                    onDragOver={(e, key) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (cat.dragOver !== key) catDispatch({ type: "drag_over", key });
                    }}
                    onDrop={handleDrop}
                    onMove={handleMove}
                  />
                </motion.div>
              )}

              {activeTab === "danger" && (
                <motion.div
                  key="danger"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <DangerZone delState={delState} delDispatch={delDispatch} onDeleteAccount={handleDeleteAccount} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </main>
  );
}
