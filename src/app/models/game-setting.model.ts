import {v4 as uuidv4} from 'uuid';
export interface GameSetting {
    gameUnit?: string; 
    deviceServer?: string;
    deviceHavePermission?: string[];
}

export interface BillTable {
    id: string;
    debtor: string;
    payer: string;
    amount: number;
}


export class BillTable implements BillTable {
    id: string;
    debtor: string;
    payer: string;
    amount: number;

    constructor(data: Partial<BillTable>) {
        this.id = uuidv4();
        this.debtor = data?.debtor || '';
        this.payer = data?.payer || '';
        this.amount = data?.amount || 0;
    }
}

export interface Transaction {
    id: string;
    debtor: string;
    creditor: string;
    amount: number;
}

export class Transaction implements Transaction {
    id: string;
    debtor: string;
    creditor: string;
    amount: number;

    constructor(data: Partial<Transaction>) {
        this.id = uuidv4();
        this.debtor = data?.debtor || '';
        this.creditor = data?.creditor || '';
        this.amount = data?.amount || 0;
    }
}