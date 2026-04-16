import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh] px-6">
      <div className="text-center">
        <p className="text-[120px] md:text-[180px] font-medium leading-none text-[#F8D62E]">
          404
        </p>
        <h1 className="text-xl md:text-2xl font-medium text-[#303030] mt-2 mb-2">
          Страница не найдена
        </h1>
        <p className="text-sm text-[#A1A1A1] mb-8 max-w-sm mx-auto">
          Возможно, страница была удалена или вы перешли по неверной ссылке.
        </p>
        <Link href="/">
          <Button size="lg">На главную</Button>
        </Link>
      </div>
    </div>
  );
}
