import { useEffect, useState } from "react";
import { ExtractAtomValue, useSetAtom } from "jotai";

import { settingsAtom } from "@/lib/atom";
import { apiInstance } from "@/lib/utils";
import { BottomInfo } from "@/App";
import { UniversalLoading } from "./universal-loading";
import { UniversalError } from "./universal-error";

export function SettingsRetreiever(props: { children: React.ReactNode }) {
  const [isLoading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const setSettings = useSetAtom(settingsAtom);

  useEffect(() => {
    async function getSettings() {
      try {
        const getSettingsRes =
          await apiInstance<ExtractAtomValue<typeof settingsAtom>>(
            "/get-settings",
          );

        setSettings(getSettingsRes.data);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        setIsError(true);
      } finally {
        setLoading(false);
      }
    }

    getSettings();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading)
    return (
      <div className="min-h-screen">
        <UniversalLoading
          className="h-[90vh]"
          title="Mengambil data pengaturan"
          description="Mohon tunggu sebentar, karena data pengaturan di simpan pada server..."
        />
        <BottomInfo isAbsolute />
      </div>
    );

  if (isError) {
    return (
      <>
        <UniversalError
          className="h-[95vh]"
          title="Gagal mengambil data pengaturan"
          description="Gagal melakukan operasi pengambilan data pengaturan yang esensial pada aplikasi ini, mohon cek kembali apakah server sudah berjalan atau belum."
        />
        <BottomInfo isAbsolute />
      </>
    );
  }

  return props.children;
}
