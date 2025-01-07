import { lazy, Suspense, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArchiveRestore,
  FileArchive,
  LoaderCircle,
  Settings,
} from "lucide-react";
import { createBrowserRouter, RouterProvider, useLocation } from "react-router";

import { MainPage } from "@/routes/main-page";
const RecapPage = lazy(() =>
  import("@/routes/recap-page").then((module) => ({
    default: module.RecapPage,
  })),
);

import { Button } from "@/components/ui/button";

const router = createBrowserRouter([
  {
    path: "*",
    element: <>Hey</>,
  },
  {
    path: "/",
    element: (
      <>
        <NavigationButtons />
        <MainPage />
      </>
    ),
  },
  {
    path: "recap",
    element: (
      <>
        <NavigationButtons />
        <Suspense
          fallback={
            <LoaderCircle className="ml-5 mt-2 w-10 h-10 animate-spin" />
          }
        >
          <RecapPage />
        </Suspense>
      </>
    ),
  },
  {
    path: "settings",
    element: (
      <>
        <NavigationButtons />
        pengaturan lah intinya
      </>
    ),
  },
]);

function App() {
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();

        router.navigate("/settings");
      }
    };

    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <div className="absolute bottom-4 left-4">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.8,
          }}
          className="font-sundanese select-none text-2xl"
          onDoubleClick={() => location.reload()}
        >
          ᮞᮧᮛ
          <p className="select-none text-xs">recap-cuid</p>
        </motion.span>
      </div>
      <div className="absolute bottom-1 right-1">
        <small className="font-sundanese font-mono">vALPHA-0.0.1</small>
      </div>
    </>
  );
}

function NavigationButtons() {
  const location = useLocation();

  return (
    <div className="h-[8vh] w-full flex items-center pl-5 gap-3 pt-2">
      <Button
        variant={location.pathname === "/" ? "outline" : "secondary"}
        onClick={() => {
          router.navigate("/");
          window.location.reload();
        }}
      >
        <ArchiveRestore />
        Perekaman
      </Button>
      <Button
        variant={location.pathname === "/recap" ? "outline" : "secondary"}
        onClick={() => router.navigate("/recap")}
      >
        <FileArchive />
        Rekap Data
      </Button>
      <Button
        variant={location.pathname === "/settings" ? "outline" : "secondary"}
        onClick={() => router.navigate("/settings")}
      >
        <Settings />
        Pengaturan
      </Button>
    </div>
  );
}

export default App;
