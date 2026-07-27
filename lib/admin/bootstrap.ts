/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   scripts/setup-admin.ts - Explicit production administrator bootstrap CLI
 * @known_issues None
 */

export const MANAGER_PERMISSION_ALLOWLIST = [
  'cast:read',
  'cast:create',
  'cast:update',
  'cast:delete',
  'cast:*',
  'customer:read',
  'customer:create',
  'customer:update',
  'reservation:read',
  'reservation:create',
  'reservation:update',
  'reservation:delete',
  'reservation:*',
  'pricing:read',
  'pricing:create',
  'pricing:update',
  'pricing:delete',
  'pricing:*',
  'settings:read',
  'settings:update',
  'settings:*',
  'analytics:read',
  'dashboard:view',
] as const

type ManagerPermission = (typeof MANAGER_PERMISSION_ALLOWLIST)[number]
type BootstrapRole = 'super_admin' | 'manager'

export interface AdminBootstrapConfig {
  email: string
  name: string
  password: string
  role: BootstrapRole
  permissions: string[]
  storeIds: string[]
  allowExistingUpdate: boolean
}

interface ExistingAdmin {
  id: string
  email: string
  name: string
  password: string
  role: string
  permissions: unknown
  isActive: boolean
  storeAssignments: Array<{ storeId: string }>
}

interface AdminBootstrapTransaction {
  store: {
    findMany(args: {
      where: { id: { in: string[] }; isActive: true }
      select: { id: true }
    }): Promise<Array<{ id: string }>>
  }
  admin: {
    findUnique(args: {
      where: { email: string }
      include: {
        storeAssignments: {
          select: { storeId: true }
          orderBy: { storeId: 'asc' }
        }
      }
    }): Promise<ExistingAdmin | null>
    create(args: {
      data: {
        email: string
        name: string
        password: string
        role: BootstrapRole
        permissions: string
        isActive: true
      }
      select: { id: true }
    }): Promise<{ id: string }>
    update(args: {
      where: { id: string }
      data: {
        name: string
        password: string
        role: BootstrapRole
        permissions: string
        isActive: true
      }
      select: { id: true }
    }): Promise<{ id: string }>
  }
  adminStoreAssignment: {
    deleteMany(args: { where: { adminId: string } }): Promise<{ count: number }>
    createMany(args: {
      data: Array<{ adminId: string; storeId: string }>
    }): Promise<{ count: number }>
  }
}

export interface AdminBootstrapDatabase {
  $transaction<T>(operation: (transaction: AdminBootstrapTransaction) => Promise<T>): Promise<T>
}

interface BootstrapAdminDependencies {
  database: AdminBootstrapDatabase
  config: AdminBootstrapConfig
  hashPassword(password: string): Promise<string>
  verifyPassword(password: string, hash: string): Promise<boolean>
}

export interface AdminBootstrapResult {
  status: 'created' | 'unchanged' | 'updated'
  adminId: string
  email: string
  role: BootstrapRole
  storeIds: string[]
}

const MANAGER_PERMISSIONS = new Set<string>(MANAGER_PERMISSION_ALLOWLIST)
const VALUE_ARGUMENTS = new Set(['email', 'name', 'password', 'role', 'permissions', 'store-ids'])

type BootstrapEnvironment = Record<string, string | undefined>

function uniqueNonEmptyValues(value: string | undefined): string[] {
  if (!value) return []

  return Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  )
}

function parseBoolean(value: string | undefined, name: string): boolean {
  if (value === undefined || value.trim() === '') return false

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false

  throw new Error(`${name} must be either true or false`)
}

function parseArguments(argv: string[]) {
  const values = new Map<string, string>()
  let allowExistingUpdate: boolean | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) {
      throw new Error('Bootstrap arguments must use named --options')
    }

    const equalsIndex = argument.indexOf('=')
    const key = argument.slice(2, equalsIndex === -1 ? undefined : equalsIndex)
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1)

    if (key === 'allow-existing-update') {
      if (allowExistingUpdate !== undefined) {
        throw new Error('--allow-existing-update was provided more than once')
      }
      allowExistingUpdate = inlineValue === undefined ? true : parseBoolean(inlineValue, key)
      continue
    }

    if (!VALUE_ARGUMENTS.has(key)) {
      throw new Error(`Unknown bootstrap option: --${key}`)
    }
    if (values.has(key)) {
      throw new Error(`--${key} was provided more than once`)
    }

    const value = inlineValue ?? argv[index + 1]
    if (value === undefined || (inlineValue === undefined && value.startsWith('--'))) {
      throw new Error(`--${key} requires a value`)
    }
    if (inlineValue === undefined) index += 1
    values.set(key, value)
  }

  return { values, allowExistingUpdate }
}

function requireValue(value: string | undefined, name: string): string {
  const normalized = value?.trim()
  if (!normalized) {
    throw new Error(`${name} is required`)
  }
  return normalized
}

function validatePassword(password: string): void {
  if (Array.from(password).length < 16) {
    throw new Error('Admin bootstrap password must be at least 16 characters long')
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Admin bootstrap password must be at most 72 UTF-8 bytes')
  }
  if (/\r|\n/.test(password)) {
    throw new Error('Admin bootstrap password must not contain line breaks')
  }
}

function validateEmail(email: string): void {
  if (
    email !== email.trim().toLowerCase() ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a normalized valid email address')
  }
}

function validateName(name: string): void {
  if (name !== name.trim() || name.length === 0 || name.length > 100 || /\r|\n/.test(name)) {
    throw new Error('ADMIN_BOOTSTRAP_NAME must be a single-line value of 1 to 100 characters')
  }
}

function validateUniqueValues(values: string[], name: string): void {
  if (
    values.some(
      (value) => typeof value !== 'string' || value.trim() !== value || value.length === 0
    ) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`${name} must contain unique, non-empty values`)
  }
}

function assertManagerPermissions(
  permissions: string[]
): asserts permissions is ManagerPermission[] {
  if (permissions.length === 0) {
    throw new Error('ADMIN_BOOTSTRAP_PERMISSIONS is required for a manager')
  }

  const invalidPermissions = permissions.filter(
    (permission) => permission === '*' || !MANAGER_PERMISSIONS.has(permission)
  )
  if (invalidPermissions.length > 0) {
    throw new Error(`Manager permission is not allowed: ${invalidPermissions.join(', ')}`)
  }
}

function assertConfig(config: AdminBootstrapConfig): void {
  validateEmail(config.email)
  validateName(config.name)
  validatePassword(config.password)
  validateUniqueValues(config.permissions, 'ADMIN_BOOTSTRAP_PERMISSIONS')
  validateUniqueValues(config.storeIds, 'ADMIN_BOOTSTRAP_STORE_IDS')
  if (config.role !== 'super_admin' && config.role !== 'manager') {
    throw new Error('ADMIN_BOOTSTRAP_ROLE must be super_admin or manager')
  }
  if (typeof config.allowExistingUpdate !== 'boolean') {
    throw new Error('ADMIN_BOOTSTRAP_ALLOW_EXISTING_UPDATE must be a boolean')
  }

  if (config.role === 'super_admin') {
    if (config.permissions.length !== 1 || config.permissions[0] !== '*') {
      throw new Error('A super_admin must have exactly the global * permission')
    }
    if (config.storeIds.length > 0) {
      throw new Error('A super_admin must not have store assignments')
    }
    return
  }

  assertManagerPermissions(config.permissions)
  if (config.storeIds.length === 0) {
    throw new Error('ADMIN_BOOTSTRAP_STORE_IDS is required for a manager')
  }
}

/** Parses explicit environment variables and CLI flags without connecting to the database. */
export function parseAdminBootstrapConfig(
  argv: string[],
  environment: BootstrapEnvironment
): AdminBootstrapConfig {
  const parsedArguments = parseArguments(argv)
  const fromArgumentOrEnvironment = (argument: string, environmentName: string) =>
    parsedArguments.values.get(argument) ?? environment[environmentName]

  const email = requireValue(
    fromArgumentOrEnvironment('email', 'ADMIN_BOOTSTRAP_EMAIL'),
    'ADMIN_BOOTSTRAP_EMAIL'
  ).toLowerCase()
  validateEmail(email)

  const name = requireValue(
    fromArgumentOrEnvironment('name', 'ADMIN_BOOTSTRAP_NAME'),
    'ADMIN_BOOTSTRAP_NAME'
  )
  validateName(name)

  const password = fromArgumentOrEnvironment('password', 'ADMIN_BOOTSTRAP_PASSWORD')
  if (password === undefined || password.length === 0) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD is required')
  }
  validatePassword(password)

  const role = requireValue(
    fromArgumentOrEnvironment('role', 'ADMIN_BOOTSTRAP_ROLE'),
    'ADMIN_BOOTSTRAP_ROLE'
  )
  if (role !== 'super_admin' && role !== 'manager') {
    throw new Error('ADMIN_BOOTSTRAP_ROLE must be super_admin or manager')
  }

  const requestedPermissions = uniqueNonEmptyValues(
    fromArgumentOrEnvironment('permissions', 'ADMIN_BOOTSTRAP_PERMISSIONS')
  )
  const storeIds = uniqueNonEmptyValues(
    fromArgumentOrEnvironment('store-ids', 'ADMIN_BOOTSTRAP_STORE_IDS')
  )
  const permissions = role === 'super_admin' ? ['*'] : requestedPermissions

  if (role === 'super_admin' && requestedPermissions.some((permission) => permission !== '*')) {
    throw new Error('A super_admin may only specify the global * permission')
  }
  if (role === 'super_admin' && storeIds.length > 0) {
    throw new Error('A super_admin must not specify store IDs')
  }

  const config: AdminBootstrapConfig = {
    email,
    name,
    password,
    role,
    permissions,
    storeIds,
    allowExistingUpdate:
      parsedArguments.allowExistingUpdate ??
      parseBoolean(
        environment.ADMIN_BOOTSTRAP_ALLOW_EXISTING_UPDATE,
        'ADMIN_BOOTSTRAP_ALLOW_EXISTING_UPDATE'
      ),
  }
  assertConfig(config)
  return config
}

function parseStoredPermissions(value: unknown): string[] | null {
  let parsed = value
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }

  if (!Array.isArray(parsed) || !parsed.every((permission) => typeof permission === 'string')) {
    return null
  }
  return parsed
}

function sameStringSet(left: string[] | null, right: string[]): boolean {
  if (!left || left.length !== right.length) return false
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return sortedLeft.every((value, index) => value === sortedRight[index])
}

function result(
  status: AdminBootstrapResult['status'],
  adminId: string,
  config: AdminBootstrapConfig
): AdminBootstrapResult {
  return {
    status,
    adminId,
    email: config.email,
    role: config.role,
    storeIds: [...config.storeIds],
  }
}

/** Creates or explicitly reconciles one administrator in a single database transaction. */
export async function bootstrapAdmin({
  database,
  config,
  hashPassword,
  verifyPassword,
}: BootstrapAdminDependencies): Promise<AdminBootstrapResult> {
  assertConfig(config)

  return database.$transaction(async (transaction) => {
    if (config.role === 'manager') {
      const stores = await transaction.store.findMany({
        where: { id: { in: config.storeIds }, isActive: true },
        select: { id: true },
      })
      const existingStoreIds = new Set(stores.map((store) => store.id))
      const missingStoreIds = config.storeIds.filter((storeId) => !existingStoreIds.has(storeId))
      if (missingStoreIds.length > 0) {
        throw new Error(`Active stores were not found: ${missingStoreIds.join(', ')}`)
      }
    }

    const existingAdmin = await transaction.admin.findUnique({
      where: { email: config.email },
      include: {
        storeAssignments: {
          select: { storeId: true },
          orderBy: { storeId: 'asc' },
        },
      },
    })

    if (!existingAdmin) {
      const passwordHash = await hashPassword(config.password)
      const createdAdmin = await transaction.admin.create({
        data: {
          email: config.email,
          name: config.name,
          password: passwordHash,
          role: config.role,
          permissions: JSON.stringify(config.permissions),
          isActive: true,
        },
        select: { id: true },
      })

      if (config.storeIds.length > 0) {
        await transaction.adminStoreAssignment.createMany({
          data: config.storeIds.map((storeId) => ({ adminId: createdAdmin.id, storeId })),
        })
      }

      return result('created', createdAdmin.id, config)
    }

    const passwordMatches = await verifyPassword(config.password, existingAdmin.password)
    const existingStoreIds = existingAdmin.storeAssignments.map((assignment) => assignment.storeId)
    const configurationMatches =
      existingAdmin.name === config.name &&
      existingAdmin.role === config.role &&
      existingAdmin.isActive &&
      sameStringSet(parseStoredPermissions(existingAdmin.permissions), config.permissions) &&
      sameStringSet(existingStoreIds, config.storeIds) &&
      passwordMatches

    if (configurationMatches) {
      return result('unchanged', existingAdmin.id, config)
    }

    if (!config.allowExistingUpdate) {
      throw new Error(
        'Existing admin configuration differs; inspect it and re-run with --allow-existing-update only if replacement is intended'
      )
    }

    const passwordHash = passwordMatches
      ? existingAdmin.password
      : await hashPassword(config.password)
    const updatedAdmin = await transaction.admin.update({
      where: { id: existingAdmin.id },
      data: {
        name: config.name,
        password: passwordHash,
        role: config.role,
        permissions: JSON.stringify(config.permissions),
        isActive: true,
      },
      select: { id: true },
    })

    await transaction.adminStoreAssignment.deleteMany({
      where: { adminId: existingAdmin.id },
    })
    if (config.storeIds.length > 0) {
      await transaction.adminStoreAssignment.createMany({
        data: config.storeIds.map((storeId) => ({ adminId: existingAdmin.id, storeId })),
      })
    }

    return result('updated', updatedAdmin.id, config)
  })
}
