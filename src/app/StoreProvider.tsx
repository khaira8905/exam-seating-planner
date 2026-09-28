import { useReducer, type ReactNode } from 'react'
import { initialState, reducer, StoreContext } from './store'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}
