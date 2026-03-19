import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TonerStockAggregate {
    total: number;
    byColor: Record<string, number>;
    lowStockCount: number;
}

export function useTonerStock() {
    return useQuery({
        queryKey: ["toner-stock-aggregate"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("estoque_toners")
                .select("*");

            if (error) throw error;

            const aggregate: TonerStockAggregate = {
                total: 0,
                byColor: {},
                lowStockCount: 0,
            };

            data.forEach((toner) => {
                const itemTotal = (toner.stock_general || 0) + (toner.stock_intermediate || 0) + (toner.stock_small || 0);
                aggregate.total += itemTotal;

                const color = toner.cor.toLowerCase();
                aggregate.byColor[color] = (aggregate.byColor[color] || 0) + itemTotal;

                // Threshold of 3 for low stock alert
                if (itemTotal < 3) {
                    aggregate.lowStockCount++;
                }
            });

            return aggregate;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}
