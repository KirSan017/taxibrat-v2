import { Controller, Get, Query } from "@nestjs/common";
import { PublicService } from "./public.service";

@Controller("public")
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get("honor-board")
  getHonorBoard() {
    return this.publicService.getHonorBoard(10);
  }

  @Get("stats")
  getStats() {
    return this.publicService.getStats();
  }

  @Get("parks/search")
  searchPark(@Query("name") name?: string) {
    return this.publicService.searchParkByName(name ?? "");
  }

  @Get("address-suggest")
  addressSuggest(@Query("q") q?: string) {
    return this.publicService.addressSuggest(q ?? "");
  }

  @Get("banner")
  getBanner() {
    return this.publicService.getBanner();
  }

  @Get("points-review")
  getPointsReview() {
    return this.publicService.getPointsReview();
  }

  @Get("points-config")
  getPointsConfig() {
    return this.publicService.getPointsConfig();
  }
}
