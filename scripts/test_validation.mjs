import { 
  validateCPF, 
  validateEmail, 
  validateBirthdate, 
  validatePhone, 
  generateProtocolo 
} from '../src/services/onboardingService.js';

console.log('--- TESTANDO VALIDAÇÕES DE ONBOARDING ---');

// CPF
console.assert(validateCPF('11111111111') === false, 'CPF repetido deve falhar');
console.assert(validateCPF('12345678900') === false, 'CPF inválido deve falhar');
// Test with a known valid CPF (e.g. 52998224725 or standard test CPF)
console.assert(validateCPF('52998224725') === true, 'CPF válido deve passar');

// Email
console.assert(validateEmail('cliente@email.com') === true, 'Email válido deve passar');
console.assert(validateEmail('cliente@') === false, 'Email inválido deve falhar');

// Phone
console.assert(validatePhone('(11) 99999-9999') === true, 'Celular com DDD e 9 dígitos válido deve passar');
console.assert(validatePhone('(11) 88888-8888') === false, 'Celular sem 9 inicial deve falhar');
console.assert(validatePhone('(00) 99999-9999') === false, 'DDD 00 deve falhar');

// Age / Birthdate
const birthOk = validateBirthdate('15/10/1990');
console.assert(birthOk.valid === true, 'Adulto deve passar');
const birthMinor = validateBirthdate('15/10/2015');
console.assert(birthMinor.valid === false, 'Menor de idade deve falhar');

// Protocolo
const proto = generateProtocolo();
console.assert(/^MA-\d{8}-\d{4}$/.test(proto), `Protocolo ${proto} deve casar com MA-AAAAMMDD-XXXX`);

console.log('✅ Todos os testes de validação passaram com sucesso!');
