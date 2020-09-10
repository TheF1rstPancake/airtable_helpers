
/** Is is an ok place to import from */
import GlobalConfig from "@airtable/blocks/dist/types/src/global_config"

export interface GlobalManagerClass {
	readonly init: boolean
	readonly status: boolean
	validate(): void
	becomeManager(): Promise<void>
	tryToBecomeManager(): Promise<void>
	releaseManager(): Promise<void>
	resetStatus(): Promise<void>
}

interface GlobalManagerProps {
	globalConfig: GlobalConfig
	triggerUpdate(status: boolean): void
}

export class GlobalManager implements GlobalManagerClass {
	private globalConfig: GlobalConfig = null
	private globalId = Math.floor(Math.random() * 1000000)
	private globalKey = 'managerId'
	private isManager: boolean = false
	private released: boolean = false
	private loading: boolean = false
	private triggerUpdate: (status: boolean) => void = null
	init: boolean

	constructor(props: GlobalManagerProps) {
		this.globalConfig = props.globalConfig
		this.triggerUpdate = props.triggerUpdate
		window.addEventListener('beforeunload', () =>
			this.releaseManager()
		)
		this.initialize()
	}

	/** Attmeps to become the manager */
	private async initialize() {
		await this.tryToBecomeManager()
		this.init = true
	}

	/** Checks to see if another user is the manager */
	private checkStatus(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if(this.globalConfig.get(this.globalKey) === this.globalId) return
			this.loading = true
			if(this.globalConfig.get('active') !== false)
				await this.globalConfig.setAsync('active', false)
			/** Allow the manager to reset the status if they are active */
			setTimeout(async () => {
				const value = this.globalConfig.get('active') as boolean
				if(value === false) await this.becomeManager()
				this.loading = false
				resolve()
			}, 1000)
		})
	}

	/** Ensures this block is the manager */
	validate() {
		if(this.globalId !== this.globalConfig.get(this.globalKey)) {
			this.isManager = false
			this.triggerUpdate(this.isManager)
		}
	}

	/** Sets the manaerId key in Global Confif to this class's id
	 * @TODO check if current global manager has heigher privlages
	 * 	and if so, request to take control instead of just taking it
	 */
	async becomeManager(): Promise<void> {
		if(this.released) return
		if(this.globalConfig.hasPermissionToSet(this.globalKey)) {
			this.isManager = true
			await this.globalConfig.setPathsAsync([{
				path: [this.globalKey], value: this.globalId
			}, {
				path: ['active'], value: true
			}])
			this.triggerUpdate(this.isManager)
		}
	}

	/** Becomes the manager if no one else is */
	async tryToBecomeManager(): Promise<void> {
		if(this.loading || this.released) return
		await this.checkStatus()
	}

	/** Sets the managerId in the Global Data to null
	 * 	Other users can now attempt to become the manager
	 */
	async releaseManager(): Promise<void> {
		if(!this.isManager) return
		this.released = true
		this.isManager = false
		this.globalConfig.setAsync(this.globalKey, null)
		this.triggerUpdate(this.isManager)
	}

	/** Resets the active status to true
	 * 	Allows the other blocks to know that there is a user acting as the manager
	 */
	async resetStatus(): Promise<void> {
		const value = this.globalConfig.get('active') as boolean
		if(this.isManager && value === false)
			await this.globalConfig.setAsync('active', true)
	}

	get status() { return this.isManager }
}