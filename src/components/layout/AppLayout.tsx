import { NavLink, Outlet } from 'react-router-dom'
import { routes } from '@/router/routes'

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
  }`

export const AppLayout = () => (
  <div className='min-h-screen'>
    <header className='border-b border-white/10'>
      <div className='mx-auto flex max-w-5xl items-center justify-between px-6 py-4'>
        <span className='font-semibold text-white'>
          websocket-lab <span className='text-slate-500'>· Binance live data</span>
        </span>
        <nav className='flex gap-1'>
          {routes
            .filter(route => route.title)
            .map(route => (
              <NavLink key={route.path} to={route.path} className={linkClasses}>
                {route.title}
              </NavLink>
            ))}
        </nav>
      </div>
    </header>

    <main className='mx-auto max-w-5xl px-6 py-8'>
      <Outlet />
    </main>
  </div>
)
