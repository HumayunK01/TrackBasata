import { useReducer, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
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
    case "open_add":
      return { ...s, dialogOpen: true, editingKey: null, form: emptyForm, formError: "" };
    case "open_edit":
      return {
        ...s,
        dialogOpen: true,
        editingKey: a.cat.key,
        form: { label: a.cat.label, short: a.cat.short },
        formError: "",
      };
    case "set_form":
      return { ...s, form: { ...s.form, ...a.patch }, formError: "" };
    case "set_error":
      return { ...s, formError: a.msg };
    case "close_dialog":
      return { ...s, dialogOpen: false };
    case "set_delete_target":
      return { ...s, deleteTarget: a.cat };
    case "drag_start":
      return { ...s, dragging: a.key };
    case "drag_over":
      return { ...s, dragOver: a.key };
    case "drag_end":
      return { ...s, dragging: null, dragOver: null };
    default:
      return s;
  }
}

const pwInit: PwState = {
  open: false,
  next: "",
  confirm: "",
  loading: false,
  error: "",
  showPassword: false,
};

function pwReducer(s: PwState, a: PwAction): PwState {
  switch (a.type) {
    case "open":
      return { ...s, open: true };
    case "close":
      return { ...pwInit };
    case "set":
      return { ...s, ...a.patch, error: "" };
    case "toggle_show":
      return { ...s, showPassword: !s.showPassword };
    case "submitting":
      return { ...s, loading: true, error: "" };
    case "done":
      return {
        ...s,
        loading: false,
        error: a.error ?? "",
        ...(a.error ? {} : { open: false, next: "", confirm: "", showPassword: false }),
      };
    default:
      return s;
  }
}

const delInit: DelState = { open: false, confirmText: "", password: "", loading: false };

function delReducer(s: DelState, a: DelAction): DelState {
  switch (a.type) {
    case "open":
      return { ...delInit, open: true };
    case "close":
      return { ...delInit };
    case "set_text":
      return { ...s, confirmText: a.text };
    case "set_pw":
      return { ...s, password: a.pw };
    case "submitting":
      return { ...s, loading: true };
    case "done":
      return { ...delInit };
    default:
      return s;
  }
}

const profileInit: ProfileState = { open: false, first_name: "", last_name: "", loading: false };

function profileReducer(s: ProfileState, a: ProfileAction): ProfileState {
  switch (a.type) {
    case "open":
      return { open: true, first_name: a.first_name, last_name: a.last_name, loading: false };
    case "close":
      return { ...profileInit };
    case "set":
      return { ...s, ...a.patch };
    case "submitting":
      return { ...s, loading: true };
    case "done":
      return { ...profileInit };
    default:
      return s;
  }
}

type SettingsTab = "profile" | "preferences" | "categories" | "danger";

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  destructive?: boolean;
}

const SETTINGS_TABS: TabItem[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, destructive: true },
];

const VALID_TABS: SettingsTab[] = ["profile", "preferences", "categories", "danger"];
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as SettingsTab | null;
  const activeTab: SettingsTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "profile";

  const setActiveTab = (tab: SettingsTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = SETTINGS_TABS.findIndex((t) => t.id === activeTab);
    const nextIdx =
      e.key === "ArrowRight"
        ? (idx + 1) % SETTINGS_TABS.length
        : (idx - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length;
    setActiveTab(SETTINGS_TABS[nextIdx].id);
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
    if (!label) {
      catDispatch({ type: "set_error", msg: "Category label is required." });
      return;
    }
    if (!short) {
      catDispatch({ type: "set_error", msg: "Short name is required." });
      return;
    }
    if (short.length > 10) {
      catDispatch({ type: "set_error", msg: "Short name must be 10 characters or fewer." });
      return;
    }

    if (cat.editingKey) {
      updateCategory.mutate(
        { key: cat.editingKey, updates: { label, short } },
        { onSuccess: () => catDispatch({ type: "close_dialog" }) }
      );
    } else {
      const key = toKey(label);
      if (!key) {
        catDispatch({ type: "set_error", msg: "Could not derive a valid key from this label." });
        return;
      }
      if (categories.some((c) => c.key === key)) {
        catDispatch({ type: "set_error", msg: "A category with this name already exists." });
        return;
      }
      addCategory.mutate(
        { key, label, short, position: categories.length },
        { onSuccess: () => catDispatch({ type: "close_dialog" }) }
      );
    }
  }

  function handleDelete() {
    if (!cat.deleteTarget) return;
    deleteCategory.mutate(cat.deleteTarget.key, {
      onSuccess: () => catDispatch({ type: "set_delete_target", cat: null }),
    });
  }

  function handleDrop(targetKey: string) {
    if (!cat.dragging || cat.dragging === targetKey) {
      catDispatch({ type: "drag_end" });
      return;
    }
    const from = categories.findIndex((c) => c.key === cat.dragging);
    const to = categories.findIndex((c) => c.key === targetKey);
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderCategories.mutate(next, {
      onSuccess: () => toast.success("Category order updated."),
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
      onSuccess: () => toast.success("Category order updated."),
    });
  }

  const handleChangePassword = async () => {
    if (!pwState.next) {
      pwDispatch({ type: "done", error: "New password is required." });
      return;
    }
    if (pwState.next.length < 6) {
      pwDispatch({ type: "done", error: "Password must be at least 6 characters." });
      return;
    }
    if (pwState.next !== pwState.confirm) {
      pwDispatch({ type: "done", error: "Passwords do not match." });
      return;
    }
    pwDispatch({ type: "submitting" });
    const { error } = await supabase.auth.updateUser({ password: pwState.next });
    if (error) {
      pwDispatch({ type: "done", error: error.message });
      return;
    }
    await logAuditEvent("password_changed");
    toast.success("Password updated.");
    pwDispatch({ type: "done" });
  };

  const handleDeleteAccount = async () => {
    if (delState.confirmText !== "DELETE") return;
    if (!delState.password) {
      toast.error("Password is required to delete your account.");
      return;
    }
    delDispatch({ type: "submitting" });
    try {
      const email = user?.email;
      if (!email) throw new Error("Not authenticated");
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: delState.password,
      });
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
    if (!profileState.first_name.trim()) {
      toast.error("First name is required.");
      return;
    }
    if (!profileState.last_name.trim()) {
      toast.error("Last name is required.");
      return;
    }
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

  const [tzPreference, setTzPreference] = useState(
    () => localStorage.getItem("tz_preference") ?? "org"
  );

  const handleTzChange = (val: string) => {
    setTzPreference(val);
    localStorage.setItem("tz_preference", val);
    toast.success("Time zone preference updated.");
  };

  const tabContentMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.1 } }
    : {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.16, ease: EASE_OUT },
      };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 relative z-[1] [overscroll-behavior-y:contain] flex flex-col">
      <div className="w-full flex-1 flex flex-col justify-between gap-8 animate-fade-in min-h-full">
        {/* ── Top Workspace (Tab Navigation + Active Section) ── */}
        <div className="w-full space-y-6">
          {/* ── Grounded Tab Bar ── */}
          <div
            role="tablist"
            aria-label="Settings sections"
            onKeyDown={handleTabKeyDown}
            className="flex items-center gap-1 sm:gap-1.5 border-b border-border/60 overflow-x-auto no-scrollbar -mx-1 px-1"
          >
            {SETTINGS_TABS.map((t) => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "relative h-10 px-3 sm:px-3.5 shrink-0 inline-flex items-center gap-2 text-xs sm:text-[13px] transition-colors duration-150 select-none cursor-pointer outline-none focus-visible:text-foreground",
                    t.destructive && "sm:ml-auto",
                    active
                      ? t.destructive
                        ? "text-destructive font-semibold"
                        : "text-foreground font-semibold"
                      : t.destructive
                      ? "text-muted-foreground hover:text-destructive font-medium"
                      : "text-muted-foreground hover:text-foreground font-medium"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      active
                        ? t.destructive
                          ? "text-destructive"
                          : "text-primary"
                        : "text-current opacity-80"
                    )}
                    strokeWidth={1.8}
                  />
                  <span>{t.label}</span>

                  {t.id === "categories" && categories.length > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded-md leading-none transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {String(categories.length).padStart(2, "0")}
                    </span>
                  )}

                  {active && (
                    <motion.span
                      layoutId="settings-tab-underline"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 460, damping: 36 }
                      }
                      className={cn(
                        "absolute inset-x-0 -bottom-px h-0.5 rounded-full",
                        t.destructive ? "bg-destructive" : "bg-primary"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Active Tab Panel ── */}
          <section className="w-full min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === "profile" && (
                <motion.div key="profile" {...tabContentMotion}>
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
                <motion.div key="preferences" {...tabContentMotion}>
                  <PreferencesCard
                    tzPreference={tzPreference}
                    onTzChange={handleTzChange}
                  />
                </motion.div>
              )}

              {activeTab === "categories" && (
                <motion.div key="categories" {...tabContentMotion}>
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
                    isAdmin={profile?.role === "admin"}
                  />
                </motion.div>
              )}

              {activeTab === "danger" && (
                <motion.div key="danger" {...tabContentMotion}>
                  <DangerZone
                    delState={delState}
                    delDispatch={delDispatch}
                    onDeleteAccount={handleDeleteAccount}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* ── Policy Footer ── */}
        <footer className="pt-5 pb-2 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground select-none mt-auto">
          <span className="tabular-nums">
            Basata Tracker · {APP_VERSION}
          </span>

          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">
              Cookies
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
