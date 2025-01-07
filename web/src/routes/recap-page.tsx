import { useCallback, useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

declare global {
  interface Window {
    reloadData?: () => Promise<void> | undefined;
  }
}

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { apiInstance } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, LoaderCircle, RotateCcw, Sheet, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  return (
    <div>
      <div className="flex items-center py-2.5">
        <Input
          placeholder="Cari berdasarkan nama..."
          value={(table.getColumn("Name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("Name")?.setFilterValue(event.target.value)
          }
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Tidak ada hasil.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface TParticipant {
  Name: string;
  Cuid: string;
  Subpart: string;
  CreatedAt: string;
}

const columns: ColumnDef<TParticipant>[] = [
  {
    accessorKey: "Name",
    header: "Nama",
  },
  {
    accessorKey: "Cuid",
    header: "ID Kartu",
    cell: ({ row }) => (
      <pre className="font-mono font-semibold">{row.original.Cuid}</pre>
    ),
  },
  {
    accessorKey: "Subpart",
    header: "Peserta Bagian Dari",
  },
  {
    accessorKey: "CreatedAt",
    header: "Waktu Penambahan",
    cell: ({ row }) => (
      <>
        {format(new Date(row.original.CreatedAt), "dd MMMM yyyy, kk.mm", {
          locale: id,
        })}
      </>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [open, setOpen] = useState(false);

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [isDeleting, setDelete] = useState(false);

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [confirmationText, setConfirmText] = useState("");

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const reallySure = useMemo(
        () => confirmationText === "saya yakin dan ingin menghapus peserta ini",
        [confirmationText],
      );

      function deleteParticipant() {
        setDelete(true);

        setTimeout(async () => {
          if (reallySure) {
            try {
              const response = await apiInstance.delete<{
                success: boolean;
                message: string;
              }>(`/remove-participant/${row.original.Cuid}`);
              const data = response.data;

              if (data.success) {
                if (window.reloadData) window.reloadData();

                toast.success("Operasi penghapusan berhasil!", {
                  description: data.message,
                });
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
              if (error.response) {
                toast.error("Gagal menghapus peserta ini", {
                  description: error.response.data.message,
                });
              } else if (error.request) {
                toast.error("Gagal menghapus peserta ini", {
                  description:
                    "Mohon cek kembali apakah server berjalan atau belum",
                });
              }
            } finally {
              setDelete(false);
              setOpen(false);
            }
          }
        }, 250);
      }

      return (
        <>
          <AlertDialog
            open={open}
            onOpenChange={() => {
              if (!isDeleting) {
                setOpen((prev) => !prev);

                if (confirmationText.length > 0) setConfirmText("");
              }
            }}
          >
            <AlertDialogTrigger>
              <Trash2 className="text-red-600" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-950 text-base">
                  Aksi yang anda lakukan dapat berakibat fatal. Jika anda
                  melakukan hal ini, maka akan secara permanen menghapus data
                  peserta pemilih atas nama <b>{row.original.Name}</b> yang
                  berasal dari bagian <b>{row.original.Subpart}</b>. Yakin?
                </AlertDialogDescription>
                <AlertDialogDescription className="text-start select-none text-zinc-900">
                  Jika yakin, ketik{" "}
                  <b>saya yakin dan ingin menghapus peserta ini</b> pada kolom
                  dibawah:
                </AlertDialogDescription>
                <Input
                  type="text"
                  autoComplete="false"
                  autoCorrect="false"
                  disabled={isDeleting}
                  value={confirmationText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!reallySure || isDeleting}
                  onClick={deleteParticipant}
                >
                  {isDeleting ? <Loader2 className="animate-spin" /> : null}
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    },
  },
];

export function RecapPage() {
  const [participantsData, setData] = useState<TParticipant[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isExporting, setExporting] = useState(false);

  const getData = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiInstance.get<TParticipant[] | null>(
        "/get-participants",
      );
      const data = response.data;

      if (data === null) setData([]);
      else setData(data);

      setLoading(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response) {
        toast.error("Gagal mengambil data ke server", {
          description: error.response.data.message,
        });
      } else if (error.request) {
        toast.error("Gagal mengambil data ke server", {
          description: "Mohon cek kembali apakah server berjalan atau belum",
        });
      }
    }
  }, []);

  const exportToExcel = useCallback(() => {
    setExporting(true);

    if (participantsData.length < 1) {
      toast.error("Minimal terdapat satu data peserta!");
      setExporting(false);
      return;
    }

    console.log(participantsData);

    setExporting(false);
  }, [participantsData]);

  useEffect(() => {
    window.reloadData = getData;

    getData();

    return () => {
      window.reloadData = undefined;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-5 py-5">
      <div className="flex items-center gap-1.5">
        <Button onClick={getData} disabled={isLoading}>
          {isLoading ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RotateCcw />
          )}{" "}
          Muat ulang data
        </Button>
        <Button onClick={exportToExcel} disabled={isLoading || isExporting}>
          <Sheet />
          Export Sebagai Excel untuk Data Aplikasi
        </Button>
      </div>
      <DataTable columns={columns} data={participantsData} />
    </div>
  );
}
