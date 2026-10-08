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
  Globe,
} from "@/components/ui/icons";

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

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }> }[] = [
  { id: "profile", label: "Profile & Security", icon: User },
  { id: "preferences", label: "Preferences & Region", icon: SlidersHorizontal },
  { id: "categories", label: "Document Categories", icon: Tag },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
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

  const ORG_TZ = "America/Phoenix";
  const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [tzPreference, setTzPreference] = useState(() => localStorage.getItem("tz_preference") ?? "org");

  const handleTzChange = (val: string) => {
    setTzPreference(val);
    localStorage.setItem("tz_preference", val);
    toast.success("Time zone preference updated.");
  };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Workspace Settings</h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card border border-border/50 rounded-full px-2.5 py-0.5 shadow-2xs">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage profile credentials, document categories, workspace appearance, and system region
            </p>
          </div>
        </div>

        {/* Tab Navigation Rail */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-1.5 w-fit max-w-full shadow-2xs">
          {SETTINGS_TABS.map((t) => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "relative shrink-0 inline-flex items-center gap-2 px-3.5 sm:px-4 h-9 rounded-xl text-xs font-medium transition-all cursor-pointer select-none",
                  active
                    ? "text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="settings-active-tab-pill"
                    className="absolute inset-0 bg-emerald-600 rounded-xl shadow-xs shadow-emerald-600/25"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                  <span>{t.label}</span>
                  {t.id === "categories" && categories.length > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                        active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {categories.length}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <AnimatePresence mode="wait">
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <PreferencesCard dailyGoal={profile?.daily_goal ?? null} />

              {/* Time Zone Section */}
              <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm transition-all">
                <div className="flex items-center gap-3.5 pb-4 border-b border-border/60">
                  <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                    <Globe className="size-4.5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Time Zone & Regional Clock</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose how dates and times are interpreted and rendered across your tables and reports
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label
                    className={cn(
                      "group flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer",
                      tzPreference === "org"
                        ? "border-emerald-500/60 bg-emerald-500/[0.04] shadow-2xs ring-1 ring-emerald-500/20"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="tz"
                      value="org"
                      checked={tzPreference === "org"}
                      onChange={() => handleTzChange("org")}
                      className="size-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Organization Time Zone</span>
                        {tzPreference === "org" && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{ORG_TZ}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                        Standardizes all logs across team members and facilities. Recommended for consistent auditing and reports.
                      </p>
                    </div>
                  </label>

                  <label
                    className={cn(
                      "group flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer",
                      tzPreference === "local"
                        ? "border-emerald-500/60 bg-emerald-500/[0.04] shadow-2xs ring-1 ring-emerald-500/20"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="tz"
                      value="local"
                      checked={tzPreference === "local"}
                      onChange={() => handleTzChange("local")}
                      className="size-4 mt-0.5 accent-emerald-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Local Device Time Zone</span>
                        {tzPreference === "local" && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{LOCAL_TZ}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                        Displays all timestamps converted to your workstation's local operating system clock.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "categories" && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <DangerZone delState={delState} delDispatch={delDispatch} onDeleteAccount={handleDeleteAccount} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer version indicator */}
        <p className="text-center font-mono text-2xs text-muted-foreground/70 tracking-[0.2em] pt-4 select-none">
          {APP_VERSION}
        </p>
      </div>
    </main>
  );
}
