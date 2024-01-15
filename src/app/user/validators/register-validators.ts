import { ValidationErrors, AbstractControl, ValidatorFn } from "@angular/forms";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class RegisterValidators {
	static match(controlName: string, matcingControlName: string): ValidatorFn {
		return (group: AbstractControl): ValidationErrors | null => {
			const control = group.get(controlName);
			const matchingControl = group.get(matcingControlName);

			if (!control || !matchingControl) {
				return { controlNotFound: false };
			}

			const error = control.value === matchingControl.value ? null : { noMatch: true };

			matchingControl.setErrors(error);

			return error;
		};
	}
}
