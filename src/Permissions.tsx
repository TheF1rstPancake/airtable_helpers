import { cursor, base } from '@airtable/blocks';
import { Table } from '@airtable/blocks/models';
import { Title, Paragraph, Button, Drawer, DefineBlock, Author } from '@ouellettec/airtable_elements';
import * as React from 'react';
import './scss/check-permissions.scss';

export enum Permissions {
	none = 0,
	read = 1,
	comment = 2,
	edit = 3,
	create = 4,
	owner = 5
}

interface RecordsPermissions {
	read: Permissions
	create: Permissions
	update: Permissions
	delete: Permissions
}

interface CheckLocationProps {
	prefTable: string
	prefView?: string | null
	authors?: Author[]
}

interface CheckPermissionsProps {
	permissions: RecordsPermissions | {all: Permissions}
	children: React.ReactChild | React.ReactChildren
}

interface CheckTableAndPermissionsProps extends CheckLocationProps, CheckPermissionsProps {
}

interface CheckLocationState {
	valid: boolean
	correctLocation: boolean
	viewId: string
	loading: boolean
}

interface CheckPermissionsState {
	isPermitted: boolean
	loading: boolean
}



export function CheckTableAndPermissions (props: CheckTableAndPermissionsProps) {
	const storage = DefineBlock.getStorage();
	let authors: Author[]
	if(storage && storage.authors) authors = storage.authors;
	return (
		<CheckPermissions permissions={props.permissions}>
			<CheckLocation prefTable={props.prefTable} prefView={props.prefView} authors={authors}>
				{props.children}
			</CheckLocation>
		</CheckPermissions>
	)
}

export class CheckLocation extends React.Component<CheckLocationProps, CheckLocationState> {
	private authors: Author[]
	private tableName: string
	private viewName: string
	state = {
		valid: false,
		correctLocation: false,
		viewId: cursor.activeViewId,
		loading: false
	}

	private CheckLocation () {
		if(cursor.activeTableId === this.props.prefTable) {
			if(this.props.prefView) {
				if(this.props.prefView === cursor.activeViewId) {
					if(!this.state.correctLocation) 
						this.setState({...this.state, correctLocation: true});
				}
			} else {
				if(!this.state.correctLocation)
					return this.setState({...this.state, correctLocation: true});
				return
			}
		}
		if(this.state.correctLocation) return this.setState({...this.state, correctLocation: false, loading: false});
	}
	private GotToPrefLocation (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
		this.setState({loading: true});
		this.props.prefView 
			? cursor.setActiveView(this.props.prefTable, this.props.prefView)
			: cursor.setActiveView(this.props.prefTable, base.getTableById(this.props.prefTable).views[0]);
	}

	private IsValid (prefTable: string, prefView?: string): boolean {
		try {
			const table = base.tables.find(t => t.name === prefTable || t.id === prefTable);
			if(!table) throw new Error('Invalid Table name or id')
			if(!this.tableName) this.tableName = table.name
			if(prefView) {
				const view = table.views.find(view => view.name === prefView || view.id === prefView);
				if(!view) throw new Error('Invalid View name or id')
				if(!this.viewName) this.viewName = view.name
			}
		} catch (error) {
			console.error('ERROR finding Table/View ', error)
			return false
		}
		return true
	}

	componentDidMount () {
		if(!this.props.authors) {
			const storage = DefineBlock.getStorage();
			if(storage && storage.authors) this.authors = storage.authors;
		} else {
			this.authors = this.props.authors
		}
		if(!this.state.valid && this.IsValid(this.props.prefTable, this.props.prefView))
			this.setState({valid: true})
	}

	componentDidUpdate() {
		if(!this.state.valid) return;
		this.CheckLocation();
	}

	render() {
		return (
			this.state.valid ? <React.Fragment>
				{this.state.correctLocation ? this.props.children : <React.Fragment>
					<Title>Invalid Location</Title>
					<div style={{
						alignSelf: 'center', 
						display: 'flex', 
						justifyContent: 'space-between', 
						margin: 'auto 0',
						width: '100%'
					}}>
						<Paragraph>Please navigate to</Paragraph>
						<Paragraph>{`Table: ${this.tableName}`}</Paragraph>
						<Paragraph>{`View: ${this.props.prefView ? this.viewName : 'ANY'}`}</Paragraph>
					</div>
					<Button
						style={{
							alignSelf: 'flex-end'
						}}
						onClick={(e) => this.GotToPrefLocation(e)}
						loading={this.state.loading}
					>Click to navigate now</Button>
				</React.Fragment>}
			</React.Fragment>
			: <React.Fragment>
				<Title>Internal Error</Title>
				<Paragraph>Error in Custom Permission Block.</Paragraph>
				<Paragraph>
					If you have some time, can you please fill out <a href="https://airtable.com/shrT2qobBQADhX1z4">this bug report form.</a>
					<br/>( Code: 500 Invalid Table / View )
				</Paragraph>
				{this.authors && <Drawer title="Authors">
					{this.authors.map((a, i) => (
						<Paragraph key={i}>{a.name} | {a.email}</Paragraph>
					))}	
				</Drawer>}
			</React.Fragment>
		)
	}
}

export class CheckPermissions extends React.Component<CheckPermissionsProps, CheckPermissionsState> {
	state = {
		isPermitted: false,
		loading: false
	}
	private table: Table

	private CheckPermission() {
		const permitted = Object.keys(this.props.permissions).map(p => {
			if(p === 'create') {
				return this.table.hasPermissionToCreateRecord();
			} else if(p === 'update') {
				return this.table.hasPermissionToUpdateRecord();
			} else if(p === 'delete') {
				return this.table.hasPermissionToDeleteRecord();
			} if(p === 'all') {
				return [
					this.table.hasPermissionToCreateRecord(),
					this.table.hasPermissionToUpdateRecord(),
					this.table.hasPermissionToDeleteRecord()
				].find(f => f === false) === false ? false : true
			}
		}).find(p => p === false) === false ? false : true
		if(this.state.isPermitted !== permitted) this.setState({...this.state, isPermitted: permitted});
	}

	componentDidMount () {
		this.table = base.getTableById(cursor.activeTableId)
		this.forceUpdate()
	}
	componentDidUpdate() {
		this.CheckPermission()
	}

	render () {
		return (
			!this.state.isPermitted ? <React.Fragment>
				<Title>Invalid Table Permissions</Title>
				<Paragraph style={{padding: '0 1vw'}} >Your account's permission level for this block does not meet the minimum requirement.</Paragraph>
				<Paragraph style={{padding: '2vw 1vw'}}>If you believe this is a mistake, please contact the base owner.</Paragraph>
			</React.Fragment> : this.props.children
		)
	}

}