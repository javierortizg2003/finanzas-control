import { SignUp } from "@clerk/nextjs"

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#060D1F" }}>
      <SignUp signInUrl="/sign-in" />
    </div>
  )
}
