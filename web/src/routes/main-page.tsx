import { useState, useMemo, useCallback, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  cuid: z.string().min(4).max(28),
  name: z.string(),
});

export function MainPage() {
  const [cuid, setCUID] = useState<string | null>(
    //null
    "0X010X2F0X3A0X4B",
  );

  const setCardUID = useCallback((cuid: string) => setCUID(cuid), []);

  if (!cuid) return <WaitingForData setCardUID={setCardUID} />;

  return <InsertNewParticipant cuid={cuid} />;
}

function InsertNewParticipant(props: { cuid: string }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cuid: props.cuid,
    },
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  return (
    <div className="flex flex-col justify-center items-center px-5 mt-2 space-y-2">
      <div className="space-y-0.5">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Tambah Pemilih Tetap Baru
        </h3>
        <p>
          Mohon tambahkan informasi pemilih dengan lengkap dan teliti. Pemilih
          berhak untuk melihat datanya di tambahkan.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Nama Peserta</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Masukan nama lengkap peserta"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Nama peserta yang akan masuk menjadi daftar pemilih tetap.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subpart"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Peserta Bagian Dari</FormLabel>
                <FormControl>
                  <Input placeholder="mis. MHS" {...field} />
                </FormControl>
                <FormDescription>Pengelompokan peserta.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />{" "}
          <Button type="submit">Submit</Button>
        </form>
      </Form>
    </div>
  );
}

function WaitingForData(props: { setCardUID: (cuid: string) => void }) {
  const { readyState } = useWebSocket(
    import.meta.env.PROD ? "/ws" : "http://localhost:8080/ws",
    {
      onMessage({ data }) {
        if (data.startsWith("SORA-THIN-CLIENT-DATA")) {
          const cuid = data.replace("SORA-THIN-CLIENT-DATA-", "");

          switch (cuid) {
            case "UNAVAIL":
              break;

            default:
              props.setCardUID(cuid);
              break;
          }
        }
      },
      share: true,
      shouldReconnect: () => true,
      retryOnError: true,
      reconnectInterval: 1100,
      reconnectAttempts: 5,
      onReconnectStop() {
        location.reload();
      },
    },
  );

  const badgeText = useMemo(() => {
    switch (readyState) {
      case ReadyState.CONNECTING: {
        return "MENGHUBUNGKAN DENGAN ALAT";
      }

      case ReadyState.CLOSED: {
        return "GAGAL TERHUBUNG";
      }

      case ReadyState.OPEN: {
        return "TERHUBUNG, MOHON MASUKAN KARTU";
      }
    }
  }, [readyState]);

  useEffect(() => {
    switch (readyState) {
      case ReadyState.CONNECTING: {
        toast.info("Sedang menghubungkan dengan alat...");

        break;
      }

      case ReadyState.CLOSED: {
        toast.error("Koneksi ditutup.");

        break;
      }

      case ReadyState.OPEN: {
        toast.success("Berhasil terhubung dengan alat pembaca!");

        break;
      }
    }
  }, [readyState]);

  return (
    <div className="h-[85vh] w-full flex justify-center items-center">
      <div className="space-y-3 *:text-center">
        <div className="space-y-1">
          <h3 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            Mohon Masukan Kartu ke Alat Pembaca
          </h3>
          <p className="text-xl leading-7">
            Perhatikan juga apakah status alat sudah terhubung dengan benar atau
            belum.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-2xl">
          <Badge
            variant={
              readyState === ReadyState.CONNECTING
                ? "secondary"
                : readyState === ReadyState.OPEN
                  ? "default"
                  : "destructive"
            }
          >
            {badgeText}
          </Badge>
        </div>
      </div>
    </div>
  );
}
