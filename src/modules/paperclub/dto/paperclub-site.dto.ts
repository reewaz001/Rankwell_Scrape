import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

/**
 * DTO for Paper.club site data validation
 */
export class PaperClubSiteDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  provider?: string = 'Paper Club';

  @IsString()
  @IsOptional()
  hosting_country?: string;

  @IsString()
  @IsOptional()
  hosting_code?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  articles_sponsored?: number;

  @IsNumber()
  @IsOptional()
  articles_words?: number;

  @IsNumber()
  @IsOptional()
  articles_price?: number;

  @IsNumber()
  @IsOptional()
  traffic?: number;

  @IsNumber()
  @IsOptional()
  tf?: number;

  @IsNumber()
  @IsOptional()
  cf?: number;

  @IsNumber()
  @IsOptional()
  kpi_ratio?: number;

  @IsNumber()
  @IsOptional()
  domain_ref?: number;

  @IsNumber()
  @IsOptional()
  bl?: number;

  @IsNumber()
  @IsOptional()
  keywords?: number;

  @IsNumber()
  @IsOptional()
  domainRating?: number;

  @IsNumber()
  @IsOptional()
  domainAge?: number;

  @IsString()
  @IsOptional()
  maxTopicalTrustFlow?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  googleNews?: number;

  @IsNumber()
  @IsOptional()
  new?: number;

  @IsString()
  link_ahref: string;

  @IsString()
  entry_date: string;
}
