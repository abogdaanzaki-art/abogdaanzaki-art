import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(userId, dto);
  }

  @Get('assistant/:assistantId')
  byAssistant(@Param('assistantId') assistantId: string) {
    return this.reviewService.findByAssistant(parseInt(assistantId, 10));
  }

  @Get('order/:orderId')
  byOrder(@Param('orderId') orderId: string) {
    return this.reviewService.findByOrder(parseInt(orderId, 10));
  }
}
