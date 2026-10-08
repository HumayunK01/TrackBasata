import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  RotateCcw,
  RefreshCw,
  Download,
  LogOut,
  Target,
  Palette,
  Clock,
  Sun,
  Moon,
  Globe,
  Tag,
  Tags,
  AlertTriangle,
  TriangleAlert,
  Trash2,
  ShieldAlert,
  User,
  UserX,
  UserCheck,
  SlidersHorizontal,
  ShieldX,
} from "lucide-react";
import {
  ChevronDownIcon as ChevronDown16,
  ChevronUpIcon as ChevronUp16,
  ChevronLeftIcon as ChevronLeft16,
  ChevronRightIcon as ChevronRight16,
  ChevronDoubleLeftIcon as ChevronDoubleLeft16,
  ChevronDoubleRightIcon as ChevronDoubleRight16,
  ChevronUpDownIcon as ChevronUpDown16,
  ArrowDownIcon as ArrowDown16,
  ArrowUpIcon as ArrowUp16,
  ArrowLeftIcon as ArrowLeft16,
  ArrowRightIcon as ArrowRight16,
  ArrowsUpDownIcon as ArrowsUpDown16,
} from "@heroicons/react/16/solid";
import {
  CheckIcon,
  PencilIcon,
  XMarkIcon,
  PlusIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  DocumentDuplicateIcon,
  HashtagIcon,
  UsersIcon,
  MinusIcon,
  Squares2X2Icon,
  SquaresPlusIcon,
  ChartBarSquareIcon,
  PaperAirplaneIcon,
  DocumentCheckIcon,
  BuildingOffice2Icon,
  FolderPlusIcon,
  Bars3BottomLeftIcon,
  CodeBracketSquareIcon,
  BookOpenIcon,
  SparklesIcon,
  CalendarIcon,
  PencilSquareIcon,
  UserPlusIcon,
  Cog6ToothIcon,
  TrophyIcon,
  QuestionMarkCircleIcon,
  FireIcon,
  BellIcon,
  FunnelIcon,
  ChartBarIcon,
  Bars3Icon,
  FolderIcon,
  Square3Stack3DIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";

export interface IconProps extends React.ComponentProps<"svg"> {
  size?: number | string;
}

function wrapIcon(Component: React.ComponentType<React.ComponentProps<"svg">>) {
  const WrappedIcon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size, width, height, className, ...props }, ref) => {
      return (
        <Component
          ref={ref}
          width={width ?? size}
          height={height ?? size}
          className={className}
          aria-hidden="true"
          {...props}
        />
      );
    },
  );
  WrappedIcon.displayName = Component.displayName || Component.name || "Heroicon";
  return WrappedIcon;
}

// ── Direct Heroicon Wrappers (matching project icon identifiers) ──
export const Check = wrapIcon(CheckIcon);
export const Pencil = wrapIcon(PencilIcon);
export const X = wrapIcon(XMarkIcon);
export const Plus = wrapIcon(PlusIcon);
export const Info = wrapIcon(InformationCircleIcon);
export const ChevronDown = wrapIcon(ChevronDown16);
export { Trash2 };
export const ChevronRight = wrapIcon(ChevronRight16);
export const Search = wrapIcon(MagnifyingGlassIcon);
export const MoreVertical = wrapIcon(EllipsisVerticalIcon);
export const FileText = wrapIcon(DocumentTextIcon);
export { TrendingUp };
export const CalendarDays = wrapIcon(CalendarDaysIcon);
export const Eye = wrapIcon(EyeIcon);
export const EyeOff = wrapIcon(EyeSlashIcon);
export const ChevronLeft = wrapIcon(ChevronLeft16);
export const KeyRound = wrapIcon(KeyIcon);
export const Copy = wrapIcon(DocumentDuplicateIcon);
export { Sun, Moon, Palette, Target, User, Tag, Tags, ShieldAlert, TriangleAlert, UserX, AlertTriangle, SlidersHorizontal };
export const Hash = wrapIcon(HashtagIcon);
export const Users = wrapIcon(UsersIcon);
export const Minus = wrapIcon(MinusIcon);
export const LayoutGrid = wrapIcon(Squares2X2Icon);
export { Download };
export const LayoutDashboard = wrapIcon(SquaresPlusIcon);
export const FileBarChart = wrapIcon(ChartBarSquareIcon);
export const Send = wrapIcon(PaperAirplaneIcon);
export const FileCheck = wrapIcon(DocumentCheckIcon);
export const FileCheck2 = wrapIcon(DocumentCheckIcon);
export const Building2 = wrapIcon(BuildingOffice2Icon);
export const FolderPlus = wrapIcon(FolderPlusIcon);
export const ChevronUp = wrapIcon(ChevronUp16);
export const ArrowUp = wrapIcon(ArrowUp16);
export const ArrowDown = wrapIcon(ArrowDown16);
export const List = wrapIcon(Bars3BottomLeftIcon);
export const FileJson = wrapIcon(CodeBracketSquareIcon);
export const FileType = wrapIcon(DocumentTextIcon);
export const BookOpen = wrapIcon(BookOpenIcon);
export const WandSparkles = wrapIcon(SparklesIcon);
export const PenLine = wrapIcon(PencilSquareIcon);
export const UserPlus = wrapIcon(UserPlusIcon);
export const Settings = wrapIcon(Cog6ToothIcon);
export { LogOut };
export const Trophy = wrapIcon(TrophyIcon);
export const Award = wrapIcon(TrophyIcon);
export const HelpCircle = wrapIcon(QuestionMarkCircleIcon);
export const Flame = wrapIcon(FireIcon);
export { TrendingDown };
export const ArrowUpDown = wrapIcon(ArrowsUpDown16);
export const Bell = wrapIcon(BellIcon);
export const Sparkles = wrapIcon(SparklesIcon);
export const Filter = wrapIcon(FunnelIcon);
export const BarChart2 = wrapIcon(ChartBarIcon);
export const ArrowRight = wrapIcon(ArrowRight16);
export const Menu = wrapIcon(Bars3Icon);
export const LineChart = wrapIcon(ChartBarIcon);
export { RotateCcw };
export { RefreshCw };
export const FileDown = Download;
export const Folder = wrapIcon(FolderIcon);
export const Layers = wrapIcon(Square3Stack3DIcon);
export const ChevronsLeft = wrapIcon(ChevronDoubleLeft16);
export const ChevronsRight = wrapIcon(ChevronDoubleRight16);
export const ChevronsUpDown = wrapIcon(ChevronUpDown16);
export const ListFilter = wrapIcon(FunnelIcon);
export const FileWarning = wrapIcon(DocumentTextIcon);
export const CalendarRange = wrapIcon(CalendarDaysIcon);
export const ArrowLeft = wrapIcon(ArrowLeft16);
export const Shield = wrapIcon(ShieldCheckIcon);
export const History = Clock;
export { Clock, Globe };
export const ShieldCheck = wrapIcon(ShieldCheckIcon);
export { ShieldX };
export const Ban = wrapIcon(NoSymbolIcon);

// ── Custom Matching Outline SVGs (Heroicons 24/outline styled) ──

export const Loader2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, size, width, height, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={width ?? size}
      height={height ?? size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  ),
);
Loader2.displayName = "Loader2";

export const BedDouble = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, size, width, height, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={width ?? size}
      height={height ?? size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75h19.5M2.25 16.5v-7.5a2.25 2.25 0 0 1 2.25-2.25h15a2.25 2.25 0 0 1 2.25 2.25v7.5M2.25 13.5h19.5M6 10.5h3.75M14.25 10.5H18" />
    </svg>
  ),
);
BedDouble.displayName = "BedDouble";

export const CheckCheck = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, size, width, height, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={width ?? size}
      height={height ?? size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5m-14.5 4.5 4.5 4.5" />
    </svg>
  ),
);
CheckCheck.displayName = "CheckCheck";

export const FolderInput = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, size, width, height, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={width ?? size}
      height={height ?? size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h3.379c.621 0 1.205-.246 1.636-.677l.67-.671A2.25 2.25 0 0 1 11.765 7.5H19.5a2.25 2.25 0 0 1 2.25 2.25v3M2.25 13.5l3.75-3.75m-3.75 3.75 3.75 3.75m-3.75-3.75h11.25m4.5 0a2.25 2.25 0 0 1 2.25 2.25v4.5A2.25 2.25 0 0 1 19.5 21H4.5a2.25 2.25 0 0 1-2.25-2.25v-1.5"
      />
    </svg>
  ),
);
FolderInput.displayName = "FolderInput";

export const GripVertical = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, size, width, height, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={width ?? size}
      height={height ?? size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="9" cy="6" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  ),
);
GripVertical.displayName = "GripVertical";

export const Circle = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, size, width, height, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={width ?? size}
      height={height ?? size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  ),
);
Circle.displayName = "Circle";

export const CalendarCheck = wrapIcon(CalendarDaysIcon);
export { CalendarIcon, UserCheck };
