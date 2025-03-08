export class CreateUserLogDto {
    date: Date;
    time_in: string;
    time_out?: string;  
}

export class UpdateUserLogDto {
    date?: Date;        
    time_in?: string;   
    time_out: string; 
} 