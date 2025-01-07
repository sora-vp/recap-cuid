import { useState, useMemo, useCallback, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { apiInstance } from "@/lib/utils";
import { UniversalLoading } from "@/components/universal-loading";
import { UniversalError } from "@/components/universal-error";

const baseNameSchema = z
  .string()
  .min(1, { message: "Diperlukan nama peserta!" })
  .regex(/^[a-zA-Z0-9.,'\s`-]+$/, {
    message:
      "Hanya diperbolehkan menulis alfabet, angka, koma, petik satu, dan titik!",
  });
const baseSubpartSchema = z
  .string()
  .min(1, { message: "Diperlukan bagian darimana peserta ini!" })
  .regex(/^[a-zA-Z0-9-_]+$/, {
    message: "Hanya diperbolehkan menulis alfabet, angka, dan garis bawah!",
  });

const formSchema = z.object({
  cuid: z.string().min(4).max(28),
  name: baseNameSchema,
  subpart: baseSubpartSchema,
});

export function MainPage() {
  const [cuid, setCUID] = useState<string | null>(null);

  const setCardUID = useCallback((cuid: string) => setCUID(cuid), []);

  if (!cuid) return <WaitingForData setCardUID={setCardUID} />;

  return <ParticipantExistChecker cuid={cuid} />;
}

type TProps = { cuid: string };

function ParticipantExistChecker(props: TProps) {
  const [participantExist, setParticipantExist] = useState<null | boolean>(
    null,
  );
  const [participantData, setParticipantData] = useState<null | {
    Name: string;
    Subpart: string;
  }>(null);

  useEffect(() => {
    async function getParticipant() {
      try {
        const participantAlreadyExistOrNah = await apiInstance.get<{
          success: boolean;
          exists: boolean;
          data?: {
            Name: string;
            Subpart: string;
          };
        }>(`/get-participant/${props.cuid}`);
        const resData = participantAlreadyExistOrNah.data;

        if (resData.exists) setParticipantData(resData.data!);

        setParticipantExist(resData.exists);
      } catch (e: unknown) {
        console.log(e);
      }
    }

    getParticipant();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (participantExist === null)
    return (
      <UniversalLoading
        title="Mengecek data apakah sudah terdaftar atau belum"
        description="Mohon tunggu sebentar"
      />
    );

  if (participantExist)
    return (
      <UniversalError
        title="Kartu ini sudah terdaftar"
        description={`Mohon maaf, kartu ini sudah ada dalam database komputer ini atas nama "${participantData?.Name}" yang berasal dari bagian "${participantData?.Subpart}".`}
      />
    );

  return <InsertNewParticipant {...props} />;
}

function InsertNewParticipant(props: TProps) {
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cuid: props.cuid,
      name: "",
      subpart: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await apiInstance.post("/insert-participant", values);

      form.reset();

      setSuccessDialogOpen(true);

      setTimeout(() => {
        location.reload();
      }, 2500);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
      toast.error("Gagal dalam mengunggah data. ", {
        description: "Mohon periksa kembali apakah server berjalan atau belum.",
      });
    }
  }

  return (
    <>
      <AlertDialog open={successDialogOpen}>
        <AlertDialogContent className="bg-green-700 border-green-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-100">
              Data pemilih berhasil ditambah!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-green-100">
              Data berhasil ditambah, mohon untuk mengecek data di halaman Rekap
              Data untuk melihat keseluruhan perekaman data yang berhasil
              tercatat pada sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="items-center">
            <LoaderCircle className="animate-spin text-green-300" />
            <AlertDialogDescription className="text-green-300 text-xs pb-0.5">
              Halaman ini akan dimuat ulang dalam waktu tiga detik...
            </AlertDialogDescription>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-center items-center h-[73vh] md:items-start md:h-content">
        <div className="flex flex-col justify-center items-center md:px-5 mt-4 space-y-2 w-5/6 gap-0.5">
          <div className="space-y-0.5 w-full">
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
              Tambah Pemilih Tetap Baru
            </h3>
            <p>
              Mohon tambahkan informasi pemilih dengan lengkap dan teliti.
              Pemilih berhak untuk melihat datanya di tambahkan.
            </p>
          </div>
          <p className="w-full select-none">
            ID kartu:{" "}
            <span className="font-mono font-semibold">{props.cuid}</span>
          </p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 w-full"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Nama Peserta</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={form.formState.isSubmitting}
                        placeholder="Masukan nama lengkap peserta"
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
                      <Input
                        {...field}
                        disabled={form.formState.isSubmitting}
                        placeholder="mis. MHS"
                      />
                    </FormControl>
                    <FormDescription>Pengelompokan peserta.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? (
                  <LoaderCircle className="animate-spin mr-2" />
                ) : null}
                Tambah Peserta
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </>
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
