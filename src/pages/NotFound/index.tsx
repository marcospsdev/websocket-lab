import { Link } from 'react-router-dom'

export const NotFound = () => (
  <div className='flex flex-col items-center gap-3 py-20 text-center'>
    <h1 className='text-2xl font-bold text-white'>404</h1>
    <p className='text-slate-400'>This page doesn't exist.</p>
    <Link to='/' className='text-emerald-400 hover:underline'>
      Back to the dashboard
    </Link>
  </div>
)
