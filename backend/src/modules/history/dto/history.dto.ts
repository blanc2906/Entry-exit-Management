// src/modules/history/dto/history.dto.ts
export class CreateUserLogDto {
    date: Date;
    time_in: string;
    time_out: string | null;
    check_in_device: string;  // deviceId
    check_in_auth_method: 'fingerprint' | 'card';
}

export class UpdateUserLogDto {
    time_out?: string;
    check_out_device?: string;
    check_out_auth_method?: 'fingerprint' | 'card';
}