import {
  Component,
  lazy,
  memo,
  Suspense,
  useCallback,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Clock,
  Database,
  Factory,
  FileSpreadsheet,
  HardDrive,
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Truck,
  Warehouse,
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';

const InputSection = lazy(() =>
  import('./components/InputSection').then((m) => ({ default: m.InputSection })),
);
const ExternalDataDashboard = lazy(() =>
  import('./components/ExternalDataDashboard').then((m) => ({ default: m.ExternalDataDashboard })),
);
const MapAnalytics = lazy(() =>
  import('./components/MapAnalytics').then((m) => ({ default: m.MapAnalytics })),
);
const SalesForecastAnalytics = lazy(() =>
  import('./components/SalesForecastAnalytics').then((m) => ({ default: m.SalesForecastAnalytics })),
);
const RawMaterialDemandTable = lazy(() =>
  import('./components/RawMaterialDemandTable').then((m) => ({ default: m.RawMaterialDemandTable })),
);
const BranchRawMaterialDemandTable = lazy(() =>
  import('./components/BranchRawMaterialDemandTable').then((m) => ({
    default: m.BranchRawMaterialDemandTable,
  })),
);
const BOMView = lazy(() => import('./components/BOMView').then((m) => ({ default: m.BOMView })));
const BranchLocationsView = lazy(() =>
  import('./components/BranchLocationsView').then((m) => ({ default: m.BranchLocationsView })),
);
const ProductDatabaseView = lazy(() =>
  import('./components/ProductDatabaseView').then((m) => ({ default: m.ProductDatabaseView })),
);
const PurchaseOrdersView = lazy(() =>
  import('./components/PurchaseOrdersView').then((m) => ({ default: m.PurchaseOrdersView })),
);
const GoodsReceiptView = lazy(() =>
  import('./components/GoodsReceiptView').then((m) => ({ default: m.GoodsReceiptView })),
);
const InventoryView = lazy(() =>
  import('./components/InventoryView').then((m) => ({ default: m.InventoryView })),
);

type ViewId =
  | 'dashboard'
  | 'input'
  | 'internal'
  | 'delay'
  | 'forecast'
  | 'raw-demand'
  | 'branch-demand'
  | 'bom'
  | 'branches'
  | 'products'
  | 'po'
  | 'gr'
  | 'inventory';

const nav: { id: ViewId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'input', label: 'Data Input', icon: FileSpreadsheet },
  { id: 'internal', label: 'Internal Data', icon: HardDrive },
  { id: 'delay', label: 'Delay Analysis', icon: Clock },
  { id: 'forecast', label: 'Sales Forecast', icon: BarChart3 },
  { id: 'raw-demand', label: 'Raw Material Demand', icon: Factory },
  { id: 'branch-demand', label: 'Branch Demand Analysis', icon: ClipboardList },
  { id: 'bom', label: 'Bill of Materials', icon: Boxes },
  { id: 'branches', label: 'Branch Locations', icon: Warehouse },
  { id: 'products', label: 'Product Database', icon: Database },
  { id: 'po', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'gr', label: 'Goods Receipt', icon: Truck },
  { id: 'inventory', label: 'Inventory', icon: PackageSearch },
];

function ViewFallback() {
  return (
    <div
      className="flex min-h-[min(50vh,24rem)] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200/80 bg-white/60 px-6 py-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      <p className="text-sm text-slate-600">กำลังโหลดมุมมอง…</p>
    </div>
  );
}

class ViewErrorBoundary extends Component<
  { onReset: () => void; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { onReset: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { onReset: () => void; children: ReactNode }) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[min(50vh,24rem)] flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/40 px-6 py-12">
          <p className="text-sm font-medium text-red-800">This section failed to load.</p>
          <button
            type="button"
            onClick={this.props.onReset}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Back to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const NavItem = memo(function NavItem({
  id,
  label,
  Icon,
  active,
  onSelect,
}: {
  id: ViewId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  onSelect: (id: ViewId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-200/80'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-500'}`} />
      <span className="leading-snug">{label}</span>
    </button>
  );
});

function ActiveView({ view }: { view: ViewId }) {
  let content: ReactNode = null;
  switch (view) {
    case 'dashboard':
      content = <Dashboard />;
      break;
    case 'input':
      content = <InputSection />;
      break;
    case 'internal':
      content = <ExternalDataDashboard />;
      break;
    case 'delay':
      content = <MapAnalytics />;
      break;
    case 'forecast':
      content = <SalesForecastAnalytics />;
      break;
    case 'raw-demand':
      content = <RawMaterialDemandTable />;
      break;
    case 'branch-demand':
      content = <BranchRawMaterialDemandTable />;
      break;
    case 'bom':
      content = <BOMView />;
      break;
    case 'branches':
      content = <BranchLocationsView />;
      break;
    case 'products':
      content = <ProductDatabaseView />;
      break;
    case 'po':
      content = <PurchaseOrdersView />;
      break;
    case 'gr':
      content = <GoodsReceiptView />;
      break;
    case 'inventory':
      content = <InventoryView />;
      break;
    default:
      content = null;
  }
  return <Suspense fallback={<ViewFallback />}>{content}</Suspense>;
}

export function App() {
  const [view, setView] = useState<ViewId>('dashboard');

  const selectView = useCallback((id: ViewId) => {
    setView(id);
  }, []);

  return (
    <div className="flex h-[100dvh] min-h-0 bg-slate-100 text-slate-900">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white min-h-0">
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow">
            SC
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Supply Chain</p>
            <p className="text-[11px] leading-tight text-slate-500">Planning · Bangkok</p>
          </div>
        </div>
        <nav
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-2"
          aria-label="Main"
        >
          {nav.map((item) => (
            <NavItem
              key={item.id}
              id={item.id}
              label={item.label}
              Icon={item.icon}
              active={view === item.id}
              onSelect={selectView}
            />
          ))}
        </nav>
        <footer className="shrink-0 border-t border-slate-100 p-3 text-[10px] leading-relaxed text-slate-500">
          Configure `VITE_API_BASE_URL` to connect live operational data.
        </footer>
      </aside>

      <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[1600px] p-4 transition-opacity duration-150 sm:p-6 lg:p-8">
          <ViewErrorBoundary onReset={() => setView('dashboard')}>
            <ActiveView view={view} />
          </ViewErrorBoundary>
        </div>
      </main>
    </div>
  );
}
