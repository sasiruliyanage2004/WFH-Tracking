const fs = require('fs');
const file = 'src/pages/SuperAdminList.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/AdminList/g, 'SuperAdminList');
content = content.replace(/\/api\/users\/admins/g, '/api/users/superadmins');
content = content.replace(/Admin Directory/g, 'Super Admin Directory');
content = content.replace(/Add Manager/g, 'Add Super Admin');
content = content.replace(/Administrator accounts/g, 'Super Admin accounts');
content = content.replace(/admin accounts/g, 'super admin accounts');
content = content.replace(/Total Admins/g, 'Total Super Admins');
content = content.replace(/HR Heads \(SuperAdmins\)/g, 'Active Super Admins');
content = content.replace(/Managers/g, 'Inactive Super Admins');

// Update summary stats row logic
content = content.replace(
  /admins\.filter\(a => a\.role === 'SuperAdmin'\)\.length/g,
  'admins.filter(a => a.isActive !== false).length'
);
content = content.replace(
  /admins\.filter\(a => a\.role === 'Manager'\)\.length/g,
  'admins.filter(a => a.isActive === false).length'
);

content = content.replace(/adm\.role === 'SuperAdmin' \? 'HR Head' : 'Manager'/g, "'Super Admin'");
content = content.replace(/Delete Admin/g, 'Delete Super Admin');
content = content.replace(/add manager account/g, 'add Super Admin account');

// remove roleFilter logic from result filtering
content = content.replace(/if \(roleFilter !== 'All'\) \{\s*result = result\.filter\(e => e\.role === roleFilter\);\s*\}/g, '');

fs.writeFileSync(file, content);
console.log('Replaced successfully');
