import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-3 self-center font-medium text-xl md:text-2xl">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-8" />
          </div>
          Lotsss
        </a>
        <LoginForm />
      </div>
    </div>
  )
}

