import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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

import { settingsAtom } from "@/lib/atom";
import { apiInstance } from "@/lib/utils";

const formSchema = z.object({
  author: z
    .string()
    .min(3, { message: "Nama minimal memiliki panjang tiga karakter" }),
  subpart: z
    .string()
    .min(3, { message: "Bagian dari minimal memiliki panjang tiga karakter" }),
});

export function SettingsPage() {
  const [settingsValue, setSettingsValue] = useAtom(settingsAtom);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: settingsValue,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await apiInstance.put("/update-settings", values);

      setSettingsValue(values);

      toast.success("Berhasil memperbarui pengaturan!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response) {
        toast.error("Gagal memperbarui pengaturan", {
          description: error.response.data.message,
        });
      } else if (error.request) {
        toast.error("Gagal memperbarui pengaturan", {
          description: "Mohon cek kembali apakah server berjalan atau belum",
        });
      }
    }
  }

  return (
    <div className="flex justify-center items-center h-[73vh] md:items-start md:h-content">
      <div className="flex flex-col justify-center items-center md:px-5 mt-4 space-y-2 w-5/6 gap-0.5">
        <div className="space-y-0.5 w-full">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Halaman Pengaturan
          </h3>
          <p>
            Pada halaman ini anda dapat mengatur nama pencatat dan nilai default
            bagian dari peserta supaya anda tidak mengetik nilai yang sama
            berulang-ulang.{" "}
          </p>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 w-full"
          >
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Nama Pencatat</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={form.formState.isSubmitting}
                      placeholder="Mohon masukan nama lengkap anda"
                      autoComplete="off"
                      autoCorrect="off"
                    />
                  </FormControl>
                  <FormDescription>
                    Nama lengkap anda yang bertugas sebagai pencatat kartu.
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
                      autoComplete="off"
                      autoCorrect="off"
                    />
                  </FormControl>
                  <FormDescription>
                    Nilai bawaan supaya anda tidak mengetik hal yang sama tanpa
                    harus mengulang berkali-kali.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? (
                <LoaderCircle className="animate-spin mr-2" />
              ) : null}
              Perbarui Pengaturan
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
