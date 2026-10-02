import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.resolve(__dirname, '..', 'database', 'srps_db.sql');
execSync(`cmd.exe /c "C:\\xampp\\mysql\\bin\\mysql.exe -u root srps_db < \"${sqlPath}\""`);
console.log('Database re-imported successfully from Node!');
