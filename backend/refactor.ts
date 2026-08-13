import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';

async function main() {
    const project = new Project();
    
    const routesFile = project.addSourceFileAtPath(path.join(__dirname, 'src', 'interfaces', 'routes', 'adminRoutes.ts'));
    const controllerFile = project.addSourceFileAtPath(path.join(__dirname, 'src', 'controllers', 'adminController.ts'));

    const routeCalls = routesFile.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(call => {
            const exp = call.getExpression();
            if (exp.getKind() === SyntaxKind.PropertyAccessExpression) {
                const text = exp.getText();
                return text === 'router.post' || text === 'router.get' || text === 'router.put' || text === 'router.delete';
            }
            return false;
        });

    const routeMap = {
        'post:/api/users/employees': 'createEmployee',
        'get:/api/users/employees': 'getEmployees',
        'put:/api/users/employees/:id/status': 'toggleEmployeeStatus',
        'delete:/api/users/employees/:id': 'deleteEmployee',
        'post:/api/users/admins': 'createAdmin',
        'get:/api/users/admins': 'getAdmins',
        'delete:/api/users/admins/:id': 'deleteAdmin',
        'put:/api/users/admins/:id/status': 'toggleAdminStatus',
        'get:/api/users/superadmins': 'getSuperAdmins',
        'post:/api/users/superadmins': 'createSuperAdmin',
        'delete:/api/users/superadmins/:id': 'deleteSuperAdmin',
        'get:/api/notifications': 'getNotifications',
        'put:/api/notifications/:id/read': 'markNotificationRead',
        'delete:/api/notifications/all': 'deleteAllNotifications',
        'get:/api/settings/warning-emails': 'getWarningEmails',
        'post:/api/settings/warning-emails': 'saveWarningEmails',
        'get:/api/settings/smtp': 'getSmtpConfig',
        'post:/api/settings/smtp': 'saveSmtpConfig',
        'post:/api/settings/smtp/test': 'testSmtpConfig',
        'get:/api/settings/screenshot-rules': 'getScreenshotRules',
        'post:/api/settings/screenshot-rules': 'saveScreenshotRules',
        'get:/api/settings/productivity': 'getProductivitySettings',
        'put:/api/settings/productivity': 'saveProductivitySettings',
        'post:/api/system/companies': 'createCompany',
        'get:/api/system/companies': 'getCompanies',
        'put:/api/system/companies/:id/status': 'updateCompanyStatus',
        'delete:/api/system/companies/:id': 'deleteCompany',
        'get:/api/system/analytics': 'getAnalytics',
        'post:/api/system/announcements': 'createAnnouncement',
        'delete:/api/system/announcements/:id': 'deleteAnnouncement',
        'get:/api/system/announcements': 'getAnnouncements',
        'get:/api/announcements/latest': 'getLatestAnnouncement'
    };

    const importsToAdd = new Set();
    const existingExports = controllerFile.getExportedDeclarations();
    
    for (const call of routeCalls) {
        const args = call.getArguments();
        const routePathStr = args[0].getText().replace(/['"`]/g, '');
        const method = call.getExpression().getText().split('.')[1];
        
        const key = `${method}:${routePathStr}`;
        const controllerFuncName = routeMap[key];
        
        if (!controllerFuncName) continue;
        
        const handler = args[args.length - 1];
        
        if (!existingExports.has(controllerFuncName)) {
            let bodyText = handler.getText();
            
            // Remove the 'async (req: Request, res: Response) => ' part
            if (handler.getKind() === SyntaxKind.ArrowFunction) {
                // we just take the body
                const block = handler.getBody();
                bodyText = block.getText();
            }

            controllerFile.addVariableStatement({
                isExported: true,
                declarations: [{
                    name: controllerFuncName,
                    initializer: `async (req: Request, res: Response) => ${bodyText}`
                }]
            });
        }
        
        // Replace the handler with the controller function call
        call.removeArgument(args.length - 1);
        call.addArgument(`adminController.${controllerFuncName}`);
    }

    // Add import to routes file
    routesFile.addImportDeclaration({
        defaultImport: '* as adminController',
        moduleSpecifier: '../../controllers/adminController'
    });

    // Move helper functions from routes to controller
    const helpersToMove = ['formatNotification', 'cleanupOldScreenshots', 'getCompanyDetailsMap', 'saveCompanyDetailsMap'];
    for (const helperName of helpersToMove) {
        const vDecl = routesFile.getVariableDeclaration(helperName);
        if (vDecl) {
            controllerFile.addVariableStatement({
                isExported: true,
                declarations: [{
                    name: helperName,
                    initializer: vDecl.getInitializer().getText()
                }]
            });
            vDecl.getVariableStatement().remove();
        } else {
            const funcDecl = routesFile.getFunction(helperName);
            if (funcDecl) {
                controllerFile.addFunction({
                    isExported: true,
                    name: helperName,
                    parameters: funcDecl.getParameters().map(p => ({
                        name: p.getName(),
                        type: p.getTypeNode() ? p.getTypeNode().getText() : undefined
                    })),
                    bodyText: funcDecl.getBodyText()
                });
                funcDecl.remove();
            }
        }
    }
    
    const importsToCopy = routesFile.getImportDeclarations();
    for (const imp of importsToCopy) {
        const text = imp.getText();
        if (!text.includes('express') && !text.includes('auth')) {
            // Very hacky check, just copy all non-express, non-router imports to controller if not there
             if (!controllerFile.getImportDeclaration(imp.getModuleSpecifierValue())) {
                 controllerFile.addImportDeclaration(imp.getStructure());
             }
        }
    }

    // Clean up routes file
    // Remove setInterval and cleanupOldScreenshots calls
    routesFile.getStatements().forEach(s => {
        if (s.getText().includes('setInterval(cleanupOldScreenshots')) s.remove();
        else if (s.getText().includes('cleanupOldScreenshots();')) s.remove();
    });

    await routesFile.save();
    await controllerFile.save();
    console.log('Refactor complete');
}

main().catch(console.error);
