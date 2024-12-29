import { useEffect } from "react";
import { motion } from "motion/react";
import { createBrowserRouter, RouterProvider } from "react-router";

const router = createBrowserRouter([
  {
    path: "*",
    element: <>Hey</>,
  },
  {
    path: "/",
    element: <>Halaman utama</>,
  },
  {
    path: "recap",
    element: <>download rekapan</>,
  },
  {
    path: "settings",
    element: <>pengaturan lah intinya</>,
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
        <small className="font-sundanese font-mono">vALPHA-1</small>
      </div>
    </>
  );
}

export default App;
