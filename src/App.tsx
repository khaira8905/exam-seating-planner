import { StoreProvider } from './app/StoreProvider'
import { useStore } from './app/store'
import { Header } from './components/Header'
import { Stepper } from './components/Stepper'
import { GenerateStep } from './steps/GenerateStep'
import { ReviewStep } from './steps/ReviewStep'
import { RulesStep } from './steps/RulesStep'
import { UploadStep } from './steps/UploadStep'

function CurrentStep() {
  const { state } = useStore()
  switch (state.step) {
    case 'upload':
      return <UploadStep />
    case 'rules':
      return <RulesStep />
    case 'generate':
      return <GenerateStep />
    case 'review':
    case 'download':
      return <ReviewStep />
  }
}

export default function App() {
  return (
    <StoreProvider>
      <div className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-white focus:p-2">
          Skip to content
        </a>
        <Header />
        <Stepper />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <CurrentStep />
        </main>
        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
          SeatWise runs entirely in your browser · no data is uploaded ·{' '}
          <a className="underline hover:text-teal-700" href="https://github.com/khaira8905/exam-seating-planner">
            source on GitHub
          </a>
        </footer>
      </div>
    </StoreProvider>
  )
}
