export type TPageDesign = {
    pageId: string;
    components: TInputComponentDesign[];
}
export type TInputComponentDesign = {
    id: string;
    type: EnumInputComponentType;
    content: TInputContentDesign;
    answer: string;
}
export type TInputContentDesign = {
    q: string;
    qIndex: number;
    name: string;
    options: TRadioOption[];
    requiredMessage: string;
}

export type TRadioOption = {
    label: string;
    value: string;
}

export type EnumInputComponentType = "radio";