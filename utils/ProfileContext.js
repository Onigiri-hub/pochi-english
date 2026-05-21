import { createContext, useContext } from "react"

export const ProfileContext = createContext({
  profile: null,
  setProfile: () => {},
  mofu: 0,
  setMofu: () => {},
  streak: 0,
  setStreak: () => {},
})

export function useProfileContext() {
  return useContext(ProfileContext)
}
