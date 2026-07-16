import Sidebar from './Sidebar';
import Header from './Header';
import AlertToast from '../common/AlertToast';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6 animate-fade-in">
          {children}
        </main>
      </div>
      <AlertToast />
    </div>
  );
}
